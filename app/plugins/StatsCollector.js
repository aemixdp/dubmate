import EventEmitter from 'events';

class StatsCollector extends EventEmitter {
    constructor (options) {
        super();
        this._dubtrack = options.dubtrackClient;
        this._soundcloud = options.soundcloudClient;
        this._models = options.models;
        this._tracktools = options.tracktools;
    }
    run () {
        this._dubtrack.on('chat-message', this._handleChatMessage.bind(this));
        this._dubtrack.on('track-changed', this._handleTrackChanged.bind(this));
    }
    _handleChatMessage (username, timestamp, msg) {
        var message = new this._models.Message({
            username: username,
            message: msg,
            date: timestamp
        });
        message.save(err => err && this.emit('error', err));
        this._updateUserSeenInfo(username, timestamp);
    }
    _handleTrackChanged (username, timestamp, title, originType, originId) {
        var titlestamp = this._tracktools.titlestamp(title);
        this._models.Track.findOne({ titlestamp: titlestamp }, (err, trackInfo) => {
            if (err) return this.emit('error', err);
            this._updatePlays({
                username, timestamp, title, originType, originId,
                totalPlays: trackInfo ? trackInfo.totalPlays + 1 : 1,
                previousDj: trackInfo && trackInfo.lastDj
            });
            this._updateTrackInfo(trackInfo, titlestamp, username, timestamp);
            this._updateUserPlaybackAndSeenInfo(username, timestamp);
        });
    }
    _updatePlays ({ username, timestamp, title, originType, originId, totalPlays, previousDj }) {
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
                totalPlays: totalPlays,
                dj: username,
                previousDj: previousDj,
                date: timestamp
            });
            play.save(err => err && this.emit('error', err));
        });
    }
    _updateTrackInfo (trackInfo, titlestamp, username, timestamp) {
        if (this._currentTrack) {
            this._currentTrack.save(err => err && this.emit('error', err));
        }
        trackInfo = trackInfo || new this._models.Track({
            titlestamp: titlestamp,
            totalPlays: 0
        });
        trackInfo.totalPlays += 1;
        trackInfo.lastDj = username;
        trackInfo.lastPlay = timestamp;
        this._currentTrack = trackInfo;
    }
    _updateUserPlaybackAndSeenInfo (username, timestamp) {
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
    _updateUserSeenInfo (username, timestamp) {
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