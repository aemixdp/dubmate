import EventEmitter from 'events';

class StatsCollector extends EventEmitter {
    constructor (options) {
        super();
        this._dubtrack = options.dubtrackClient;
        this._soundcloud = options.soundcloudClient;
        this._models = options.models;
    }
    run () {
        this._dubtrack.on('chat-message', this.handleChatMessage.bind(this));
        this._dubtrack.on('track-changed', this.handleTrackChanged.bind(this));
    }
    handleChatMessage (username, timestamp, msg) {
        var message = new this._models.Message({
            username: username,
            message: msg,
            date: timestamp
        });
        message.save(err => err && this.emit('error', err));
        this.updateUserSeenInfo(username, timestamp);
    }
    handleTrackChanged (username, timestamp, title, originType, originId) {
        var withTrackUrlResolved;
        if (originType == 'youtube') {
            withTrackUrlResolved = (callback) =>
                callback(`https://www.youtube.com/watch?v=${originId}`);
        } else if (originType == 'soundcloud') {
            withTrackUrlResolved = (callback) => {
                this._soundcloud.get(`/tracks/${originId}`, (err, data) => {
                    if (err) return this.emit('error', err);
                    callback(data.permalink_url);
                });
            };
        }
        withTrackUrlResolved(url => {
            var play = new this._models.Play({
                title: title,
                url: url,
                username: username,
                date: timestamp
            });
            play.save(err => err && this.emit('error', err));
            this.updateUserPlaybackAndSeenInfo(username, timestamp);
        });
    }
    updateUserPlaybackAndSeenInfo (username, timestamp) {
        this._models.User.findOne({ username: username }, (err, user) => {
            if (err) return this.emit('error', err);
            if (user) {
                user.plays += 1;
                if (!user.firstPlay) {
                    user.firstPlay = timestamp;
                }
                user.lastPlay = timestamp;
                user.lastSeen = timestamp;
            } else {
                user = new this._models.User({
                    username: username,
                    plays: 1,
                    firstSeen: timestamp,
                    lastSeen: timestamp,
                    firstPlay: timestamp,
                    lastPlay: timestamp
                });
            }
            user.save(err => err && this.emit('error', err));
        });
    }
    updateUserSeenInfo (username, timestamp) {
        this._models.User.findOne({ username: username }, (err, user) => {
            if (err) return this.emit('error', err);
            if (user) {
                user.lastSeen = timestamp;
            } else {
                user = new this._models.User({
                    username: username,
                    plays: 0,
                    firstSeen: timestamp,
                    lastSeen: timestamp,
                    firstPlay: null,
                    lastPlay: null
                });
            }
            user.save(err => err && this.emit('error', err));
        });
    }
}

export default StatsCollector;