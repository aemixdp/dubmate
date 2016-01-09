'use strict';

import EventEmitter from 'events';
import request from 'request';
import moment from 'moment-timezone';

const HANDLE_TRACK_CHANGED_DELAY_MS = 5000;

class ChatCommands extends EventEmitter {
    constructor ({dubtrackClient, soundcloudClient, youtubeClient, lastfmClient, rollVariants, models, tracktools}) {
        super();
        this._dubtrack = dubtrackClient;
        this._soundcloud = soundcloudClient;
        this._youtube = youtubeClient;
        this._lastfm = lastfmClient;
        this._rolls = rollVariants;
        this._models = models;
        this._tracktools = tracktools;
    }
    run () {
        this._dubtrack.on('chat-message', (data) => this.handleChatMessage(data));
        this._dubtrack.on('track-changed', (data) => {
            setTimeout(() => this.handleTrackChanged(data), HANDLE_TRACK_CHANGED_DELAY_MS)
        });
    }
    handleChatMessage ({username, timestamp, message}) {
        if (username == this._dubtrack.username) return;
        var command = message.trim();
        if (command[0] != '!') return;
        this.process(username, timestamp, command);
    }
    handleTrackChanged ({title}) {
        var titlestamp = this._tracktools.titlestamp(title);
        this._models.Track.findOne({titlestamp}, (err, trackInfo) => {
            if (err) return this.emit('error', err);
            this._currentTrack = trackInfo;
        });
    }
    process (username, timestamp, command) {
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

ChatCommands.command('!p', [], 'display current track plays info', function () {
    if (this._currentTrack) {
        var kievDateTime = moment.tz(this._currentTrack.lastPlay, 'Europe/Kiev').format('on DD MMM YYYY [at] HH:mm:ss');
        this._dubtrack.say(`previously played by ${this._currentTrack.lastDj} ${kievDateTime} (GMT +2)`);
    } else {
        this._dubtrack.say('this is first play');
    }
});

ChatCommands.command('!t', ['[artistname]'],
        `if artistname specified, get artist tags from lastfm,
        otherwise get current track tags from youtube/soundcloud`,
    function (username, timestamp, args) {
        var artist = args[0];
        if (artist) {
            this._lastfm.artist.getTopTags({ artist: artist }, (err, data) => {
                if (err) return this.emit('error', err);
                var tags = data.tag.map(item => item.name);
                if (tags.length == 0) {
                    this._dubtrack.say('Sadly, nothing found');
                } else {
                    this._dubtrack.say(tags.join(', '));
                }
            });
        } else if (this._currentTrack) {
            var originType = this._currentTrack.originType;
            if (originType == 'soundcloud') {
                this._soundcloud.get(`/tracks/${this._currentTrack.originId}`, (err, data) => {
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
                    this._dubtrack.say(tags.join(', '));
                });
            } else if (originType == 'youtube') {
                this._youtube.getById(this._currentTrack.originId, (err, data) => {
                    if (err) return this.emit('error', err);
                    this._dubtrack.say(data.items[0].snippet.tags.join(', '));
                });
            }
        }
    }
);

export default ChatCommands;
