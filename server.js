var CONFIG = require('./config.js');
var DATA = require('./data.js');

var request = require('request');
var express = require('express')();
var moment = require('moment');
var fs = require('fs');
var bodyParser = require('body-parser');
var HtmlEntities = require('html-entities').AllHtmlEntities;
var LastFM = require('lastfmapi');
var Firebase = require('firebase');

var htmlEntities = new HtmlEntities();
var db = new Firebase(CONFIG.FIREBASE_DB_URL);
var pubnub = require('pubnub')({
    ssl: true,
    subscribe_key: CONFIG.PUBSUB_SUBSCRIBE_KEY
});
var lastfm = new LastFM({
    api_key: CONFIG.LASTFM_API_KEY
});

var INDEX_HTML = fs.readFileSync('./index.html');
var PORT = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var IP = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

var CMD = {
    '!roll': function (category) {
        switch (category) {
            case 'genre':
                say(randomElem(DATA.ROLL_VERBS) + ' ' +
                    randomElem(DATA.ROLL_GENRES));
                break;
            default:
                say(randomElem(DATA.ROLL_VARIANTS));
                break;
        }
    },
    '!tags': function (artist) {
        artist = artist || currentArtist;
        if (!artist) return;
        lastfm.artist.getTopTags({ artist: artist }, function (err, data) {
            var tags = data.tag.map(function (item) { return item.name; });
            if (tags.length == 0) {
                say('Нету :(');
            } else {
                say(tags.join(', '));
            }
        });
    },
    '!cat': function () {
        request('http://thecatapi.com/api/images/get?format=src', function (err, data) {
            say(data.request.uri.href);
        });
    },
    '!plays': function (track) {
        track = track || currentTrack;
        if (!track) return;
        var key = cleanupKey(htmlEntities.decode(cleanupTitle(track).toLowerCase()));
        db.child(key).once('value', function (snapshot) {
            var info = snapshot.val();
            if (info) {
                say(info.plays + ', последний - ' + info.dj + ' [' + info.date + ']')
            } else {
                say('хз');
            }
        });
    }
};

CMD['!r'] = CMD['!roll'];
CMD['!t'] = CMD['!tags'];
CMD['!c'] = CMD['!cat'];
CMD['!p'] = CMD['!plays'];

var cookie = '';
var currentArtist = '';
var currentTrack = '';

function say (msg) {
    var payload = {
        "user": {
            "username": "flava",
            "status": 1,
            "roleid": 1,
            "dubs": 0,
            "created": 1445007595392,
            "lastLogin": 0,
            "userInfo": {
                "_id": "562110eb72fbd1440011c70b",
                "userid": "562110eb72fbd1440011c70a",
                "__v": 0
            },
            "_force_updated": 1445175180299,
            "_id": "562110eb72fbd1440011c70a",
            "__v": 0
        },
        "message": msg,
        "time": Date.now(),
        "realTimeChannel": "dubtrackfm-b",
        "type": "chat-message",
        "chatid": null
    };
    request.post({
        url: 'https://api.dubtrack.fm/chat/560026b8621a9e0300316300',
        json: payload,
        headers: {
            'Cookie': cookie
        }
    });
}

function guessArtist (title) {
    var sepIndex = title.indexOf(' - ');
    if (sepIndex == -1) sepIndex = title.indexOf(' – ');
    if (sepIndex == -1) sepIndex = title.indexOf(' _ ');
    if (sepIndex == -1) sepIndex = title.indexOf(' | ');
    if (sepIndex == -1) sepIndex = title.indexOf(': ');
    if (sepIndex == -1) sepIndex = title.indexOf('. ');
    if (sepIndex == -1) sepIndex = title.indexOf('_ ');
    if (sepIndex == -1) sepIndex = title.indexOf('| ');
    if (sepIndex == -1) sepIndex = title.indexOf('- ');
    if (sepIndex == -1) sepIndex = title.indexOf('– ');
    var artist = sepIndex == -1 ? title : title.substr(0, sepIndex);
    return cutBraces(artist).trim();
}

function cutBraces (string) {
    var newString = '';
    var depth = 0;
    for (var i = 0; i < string.length; ++i) {
        var c = string.charAt(i);
        if (c == '(' || c == '[' || c == '{') {
            depth++;
        } else if (c == ')' || c == ']' || c == '}') {
            if (depth > 0) {
                depth--;
                continue;
            }
        }
        if (depth == 0) {
            newString += c;
        }
    }
    return newString;
}

function cleanupTitle (string) {
    return cutBraces(string)
        .replace(/official\s*music\s*video/gi, '')
        .replace(/official\s*video/gi, '')
        .replace(/official/gi, '')
        .replace(/full\s*album/gi, '')
        .replace(/full/gi, '')
        .replace(/live at.*/gi, '')
        .replace(/live in.*/gi, '')
        .replace(/(^|[^A-Za-z])hd([^A-Za-z]|$)/gi, '')
        .replace(/(^|[^A-Za-z])hq([^A-Za-z]|$)/gi, '')
        .replace(/(^|[^A-Za-z0-9])(\d+)p/gi, '')
        .replace('—', '-')
        .replace('–', '-')
        .trim();
}

function cleanupKey (key) {
    return key.replace(/[\.#$\[\]]/g, '').trim();
}

function randomElem (array) {
    return array[Math.floor(Math.random() * array.length)];
}

function onMessage (data) {
    if (data.type == 'chat-message') {
        var msg = data.message.trim();
        var sepIndex = msg.indexOf(' ');
        if (sepIndex == -1) sepIndex = msg.length;
        var cmd = msg.slice(0, sepIndex);
        var dispatcher = CMD[cmd];
        if (dispatcher) {
            dispatcher(msg.slice(sepIndex + 1));
        }
    } else if (data.type == 'room_playlist-update') {
        currentTrack = data.songInfo.name;
        currentArtist = guessArtist(currentTrack);
        var date = moment().format('DD.MM.YY - HH:mm');
        setTimeout(function () {
            request.get({
                url: 'https://api.dubtrack.fm/user/' + data.song.userid,
                headers: { 'Cookie': cookie }
            }, function (err, res, body) {
                var json = JSON.parse(body);
                var key = cleanupKey(htmlEntities.decode(
                    cleanupTitle(currentTrack).toLowerCase()));
                db.child(key).once('value', function (snapshot) {
                    var info = snapshot.val() || {
                        dj: json.data.username,
                        date: date,
                        plays: 0
                    };
                    info.plays += 1;
                    var params = {};
                    params[key] = info;
                    db.update(params);
                });
            });
        }, 30000);
    }
}

db.authWithCustomToken(CONFIG.FIREBASE_DB_SECRET, function () {
    request.post('https://api.dubtrack.fm/auth/dubtrack')
        .form(CONFIG.CREDENTIALS)
        .on('response', function (response) {
            cookie = response.headers['set-cookie'][0];
            pubnub.subscribe({
                channel: 'dubtrackfm-b',
                presence: function () {},
                message: onMessage
            });
        });
});

express.use(bodyParser.text());

express.get('/', function (req, res) {
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(INDEX_HTML);
});

express.post('/say', function (req, res) {
    say(req.body);
    res.status(200).send('Ok!');
});

express.listen(PORT, IP);
