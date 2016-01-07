var CONFIG = require('./config/config.js');
var DATA = require('./config/data.js');

var request = require('request');
var express = require('express')();
var moment = require('moment-timezone');
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
    '!roll': (category) => {
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
    title = cleanupTitle(title);
    var sepIndex = title.indexOf(' - ');
    if (sepIndex == -1) sepIndex = title.indexOf(' _ ');
    if (sepIndex == -1) sepIndex = title.indexOf(' | ');
    if (sepIndex == -1) sepIndex = title.indexOf(': ');
    if (sepIndex == -1) sepIndex = title.indexOf('. ');
    if (sepIndex == -1) sepIndex = title.indexOf('_ ');
    if (sepIndex == -1) sepIndex = title.indexOf('| ');
    if (sepIndex == -1) sepIndex = title.indexOf('- ');
    if (sepIndex == -1) sepIndex = title.indexOf('-');
    if (sepIndex == -1) sepIndex = title.indexOf(' ');
    var artist = sepIndex == -1 ? title : title.substr(0, sepIndex);
    return artist.trim();
}

function cutBraces (str) {
    var newString = '';
    var depth = 0;
    for (var i = 0; i < str.length; ++i) {
        var c = str.charAt(i);
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
    return key
        .replace(/[\.#$\[\]]/g, '')
        .replace('/', '%')
        .trim();
}

function randomElem (array) {
    return array[Math.floor(Math.random() * array.length)];
}

function mkObj () {
    var obj = arguments[arguments.length-1];
    for (var i = arguments.length-2; i >= 0; --i) {
        var newObj = {};
        newObj[arguments[i]] = obj;
        obj = newObj;
    }
    return obj;
}

function onMessage (data) {
    var time = moment().tz('Europe/Kiev');

    if (data.type == 'chat-message') {
        var msg = data.message.trim();

        var sepIndex = msg.indexOf(' ');
        if (sepIndex == -1) sepIndex = msg.length;
        var cmd = msg.slice(0, sepIndex);
        var dispatcher = CMD[cmd];
        if (dispatcher) {
            dispatcher(msg.slice(sepIndex + 1));
        }

        db.update(mkObj('chatlog/' + time.format('YYYY_MM_DD') + '/' + time.format('HH_mm_ss(SSS)'), {
            username: data.user.username,
            message: msg
        }));
    } else if (data.type == 'room_playlist-update') {
        var track = data.songInfo.name;
        if (track == currentTrack) return;
        currentTrack = track;
        currentArtist = guessArtist(currentTrack);
        setTimeout(function () {
            request.get({
                url: 'https://api.dubtrack.fm/user/' + data.song.userid,
                headers: { 'Cookie': cookie }
            }, function (err, res, body) {
                var json = JSON.parse(body);
                var key = cleanupKey(htmlEntities.decode(
                    cleanupTitle(track).toLowerCase()));
                db.child(key).once('value', function (snapshot) {
                    var info = snapshot.val() || { plays: 0 };
                    info.dj = json.data.username;
                    info.date = time.format('DD.MM.YY - HH:mm');
                    info.plays += 1;
                    if (key != 'chatlog') {
                        db.update(mkObj(key, info));
                    }
                    db.update(mkObj('chatlog/' + time.format('YYYY_MM_DD') + '/' + time.format('HH_mm_ss(SSS)'), {
                        username: json.data.username,
                        song: key
                    }));
                });
            });
        }, 30000);
    }
}

db.authWithCustomToken(CONFIG.FIREBASE_DB_SECRET, function () {
    request.post('https://api.dubtrack.fm/auth/dubtrack')
        .form(CONFIG.CREDENTIALS)
        .command('response', function (response) {
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
