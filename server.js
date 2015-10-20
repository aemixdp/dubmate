var CONFIG = require('./config.js');
var DATA = require('./data.js');

var request = require('request');
var express = require('express')();
var pubnub = require('pubnub')({
    ssl: true,
    subscribe_key: CONFIG.PUBSUB_SUBSCRIBE_KEY
});

var PORT = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var IP = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

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
            say(randomElem(DATA.ROLL_VARIANTS));
            break;
        case '!roll genre':
            say(randomElem(DATA.ROLL_VERBS) + ' ' + randomElem(DATA.ROLL_GENRES));
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

express.get('/', function (req, res) {
    res.status(200).send('Ok mister :)');
});

express.listen(PORT, IP);