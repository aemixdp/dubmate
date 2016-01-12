'use strict';

import EventEmitter from 'events';
import request from 'request';
import moment from 'moment-timezone';

const HANDLE_TRACK_CHANGED_DELAY_MS = 5000;

class ChatCommands extends EventEmitter {
    constructor ({
        dubtrackClient, soundcloudClient, youtubeClient, lastfmClient,
        rollVariants, models, tracktools, localizer
    }) {
        super();
        this._dubtrack = dubtrackClient;
        this._soundcloud = soundcloudClient;
        this._youtube = youtubeClient;
        this._lastfm = lastfmClient;
        this._rolls = rollVariants;
        this._models = models;
        this._tracktools = tracktools;
        this._localize = localizer;
    }
    run () {
        this._dubtrack.on('chat-message', (data) => this._handleChatMessage(data));
        this._dubtrack.on('track-changed', (data) => {
            setTimeout(() => this._handleTrackChanged(data), HANDLE_TRACK_CHANGED_DELAY_MS)
        });
    }
    _handleChatMessage ({username, timestamp, message}) {
        if (username == this._dubtrack.username) return;
        var command = message.trim();
        if (command[0] != '!') return;
        this._process(username, timestamp, command);
    }
    _handleTrackChanged ({title}) {
        var titlestamp = this._tracktools.titlestamp(title);
        this._models.Track.findOne({titlestamp}, (err, trackInfo) => {
            if (err) return this.emit('error', err);
            this._currentTrack = trackInfo;
        });
    }
    _process (username, timestamp, command) {
        var parts = command.split(/\s+/);
        var commandName = parts[0];
        var commandArgs = parts.slice(1);
        var processor = ChatCommands._commandHandlers.get(commandName);
        this.emit('command', commandName, commandArgs, processor ? true : false);
        if (processor) {
            processor.call(this, username, timestamp, commandArgs);
        }
    }
}

ChatCommands.registry = [];
ChatCommands._commandHandlers = new Map();

ChatCommands.command = function (name, args, description, callback) {
    ChatCommands.registry.push({
        name: name,
        args: args,
        description: description
    });
    ChatCommands._commandHandlers.set(name, callback);
};

ChatCommands.command('!c', [], 'get a random picture of a cat', function () {
    request('http://thecatapi.com/api/images/get?format=src', (err, data) => {
        if (err) return this.emit('error', err);
        this._dubtrack.say(data.request.uri.href);
    });
});

ChatCommands.command('!r', [], 'roll a genre for your next track', function () {
    this._dubtrack.say(this._rolls[Math.floor(Math.random() * this._rolls.length)]);
});

ChatCommands.command('!p', ['[tracktitle]'],
    'display track plays info for given title, if specified, otherwise for current track',
    function (username, timestamp, args) {
        var title = args.join(' ');
        var withTrackResolved;
        if (title) {
            withTrackResolved = (callback) => {
                var titlestamp = this._tracktools.titlestamp(title);
                this._models.Track.findOne({titlestamp}, (err, trackInfo) => {
                    if (err) return this.emit('error', err);
                    callback(trackInfo);
                });
            };
        } else {
            withTrackResolved = (callback) =>
                callback(this._currentTrack);
        }
        withTrackResolved((trackInfo) => {
            if (trackInfo) {
                var kievDateTime = moment.tz(trackInfo.lastPlay, 'Europe/Kiev').format('on DD MMM YYYY [at] HH:mm:ss');
                this._dubtrack.say(`previously played by ${trackInfo.lastDj} ${kievDateTime} (GMT +2), ` +
                    `${trackInfo.totalPlays} total plays`);
            } else {
                this._dubtrack.say('not played before');
            }
        });
    }
);

ChatCommands.command('!t', ['[artistname]'],
        'if artistname specified, get artist tags from lastfm, ' +
        'otherwise get current track tags from youtube/soundcloud and lastfm',
    function (username, timestamp, args) {
        var noTags = this._localize('no tags');
        var trackInfo = this._dubtrack.getTrackInfo();
        var artist = args[0] || (trackInfo && this._tracktools.guessArtist(trackInfo.title));
        if (!artist) return;
        this._lastfm.artist.getTopTags({artist}, (err, data) => {
            if (err && err.error == 6) {
                this._dubtrack.say('lastfm: ' + this._localize('artist not found'));
            } else {
                if (err) return this.emit('error', err);
                var tags = data.tag.map(item => item.name);
                this._dubtrack.say('lastfm: ' + (tags.join(', ') || noTags));
            }
        });
        if (!args[0] && trackInfo) {
            var originType = trackInfo.originType;
            if (originType == 'soundcloud') {
                this._soundcloud.get(`/tracks/${trackInfo.originId}`, (err, data) => {
                    if (err) return this.emit('error', err);
                    var tagWords = data.tag_list.split(' ');
                    var tags = [];
                    var compoundTag = '';
                    var parsingCompoundTag = false;
                    for (var tagWord of tagWords) {
                        if (parsingCompoundTag) {
                            compoundTag += ' ';
                            var len = tagWord.length;
                            if (tagWord[len - 1] == '"') {
                                compoundTag += tagWord.substr(0, len - 1);
                                tags.push(compoundTag);
                                parsingCompoundTag = false;
                            } else {
                                compoundTag += tagWord;
                            }
                        } else if (tagWord[0] == '"') {
                            parsingCompoundTag = true;
                            compoundTag = tagWord.substr(1);
                        } else {
                            tags.push(tagWord);
                        }
                    }
                    this._dubtrack.say('soundcloud: ' + (tags.join(', ') || noTags));
                });
            } else if (originType == 'youtube') {
                this._youtube.getById(trackInfo.originId, (err, data) => {
                    if (err) return this.emit('error', err);
                    var tags = data.items[0].snippet.tags || [];
                    this._dubtrack.say('youtube: ' + (tags.join(', ') || noTags));
                });
            }
        }
    }
);

ChatCommands.command('!l', [], "get link to current track's origin (most useful for soundcloud)", function () {
    var trackInfo = this._dubtrack.getTrackInfo();
    if (trackInfo.originType == 'soundcloud') {
        this._soundcloud.get(`/tracks/${trackInfo.originId}`, (err, data) => {
            if (err) return this.emit('error', err);
            this._dubtrack.say(data.permalink_url);
        });
    } else if (trackInfo.originType == 'youtube') {
        this._dubtrack.say(`https://www.youtube.com/watch?v=${trackInfo.originId}`);
    }
});

export default ChatCommands;
