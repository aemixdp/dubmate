var CONFIG = require('./config.js');
var request = require('request');
var pubnub = require('pubnub')({
    ssl: true,
    subscribe_key: CONFIG.PUBSUB_SUBSCRIBE_KEY
});

var ROLL_VERBS = [
    'ставь',
    'ебашь',
    'хуярь',
    'лабай',
    'замути'
];

var ROLL_GENRES = [
    'дабстеп',
    'гэридж',
    'хаус',
    'техно',
    'трап',
    'драмчик',
    'к-поп',
    'рок',
    'панк',
    'пост-панк',
    'хип-хап',
    'рэп',
    'джаз',
    'блюз'
];

var cookie = '';

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
    switch (data.message) {
        case '!roll':
            say(randomElem(ROLL_VERBS) + ' ' + randomElem(ROLL_GENRES));
            break;
        case '!cat':
            request('http://thecatapi.com/api/images/get?format=src', function (err, res) {
                say(res.request.uri.href);
            });
            break;
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

function randomElem (array) {
    return array[Math.floor(Math.random() * array.length)];
}
