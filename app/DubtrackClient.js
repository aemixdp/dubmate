'use strict';

import util from 'util';
import EventEmitter from 'events';
import DubAPI from 'dubapi';

class DubtrackClient extends EventEmitter {
    constructor ({username, password, room}) {
        super();
        this.username = username;
        this.password = password;
        this.room = room;
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
                this.emit('chat-message', {
                    username: data.user.username,
                    timestamp: new Date(data.time),
                    message: data.message,
                    id: data.id
                });
            });
            dubapi.on(dubapi.events.roomPlaylistUpdate, (data) => {
                if (data.startTime != -1) return;
                this.emit('track-changed', {
                    username: data.user.username,
                    timestamp: new Date(),
                    title: data.media.name,
                    originType: data.media.type,
                    originId: data.media.fkid
                });
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
    getTrackInfo () {
        var media = this._dubapi.getMedia();
        var dj = this._dubapi.getDJ();
        return media && {
            username: dj.username,
            timestamp: new Date(media.created),
            title: media.name,
            originType: media.type,
            originId: media.fkid
        };
    }
    deleteChatMessage (messageId) {
        this._dubapi.moderateDeleteChat(messageId);
    }
}

export default DubtrackClient;
