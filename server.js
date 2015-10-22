var CONFIG = require('./config.js');
var DATA = require('./data.js');

var request = require('request');
var express = require('express')();
var fs = require('fs');
var bodyParser = require('body-parser');
var LastFM = require('lastfmapi');
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
    '!tags': function () {
        var artist = Array.prototype.join.call(arguments, ' ') || currentArtist;
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
        request('http://thecatapi.com/api/images/get?format=src', function (err, res) {
            say(res.request.uri.href);
        });
    }
};

var cookie = '';
var currentArtist = '';

request.post('https://api.dubtrack.fm/auth/dubtrack')
    .form(CONFIG.CREDENTIALS)
    .on('response', function (data) {
        cookie = data.headers['set-cookie'][0];
        pubnub.subscribe({
            channel: 'dubtrackfm-b',
            message: onMessage,
            presence: onPresence
        });
    });

function onMessage (data) {
    if (data.type == 'chat-message') {
        var components = data.message.trim().split(/\s+/);
        var dispatcher = CMD[components[0]];
        if (dispatcher) {
            dispatcher.apply(this, components.slice(1));
        }
    } else if (data.type == 'room_playlist-update') {
        currentArtist = guessArtist(data.songInfo.name);
    }
}

function onPresence (data) {}

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
    return cleanBraces(artist).trim();
}

function cleanBraces (string) {
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

function randomElem (array) {
    return array[Math.floor(Math.random() * array.length)];
}

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