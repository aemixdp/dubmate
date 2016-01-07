'use strict';

import util from 'util';
import EventEmitter from 'events';
import DubAPI from 'dubapi';

class DubtrackClient extends EventEmitter {
    constructor (options) {
        super();
        this.username = options.username;
        this.password = options.password;
        this.room = options.room;
    }
    login (callback) {
        new DubAPI({
            username: this.username,
            password: this.password
        }, (err, dubapi) => {
            if (err) return callback(err);
            this._dubapi = dubapi;
            dubapi.on('connected', () => this.emit('connected'));
            dubapi.on('disconnected', () => this.emit('disconnected'));
            dubapi.on('error', (err) => this.emit('error', err));
            dubapi.on(dubapi.events.chatMessage, (data) => {
                this.emit('chat-message', data.user.username, new Date(data.time), data.message);
            });
            dubapi.on(dubapi.events.roomPlaylistUpdate, (data) => {
                if (data.startTime != -1) return;
                this.emit('track-changed', data.user.username, new Date(),
                    data.media.name, data.media.type, data.media.fkid);
            });
            callback();
        });
    }
    connect () {
        this._dubapi.connect(this.room);
    }
    say (message) {
        this._dubapi.sendChat(message);
    }
}

export default DubtrackClient;
