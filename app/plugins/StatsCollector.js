import EventEmitter from 'events';

class StatsCollector extends EventEmitter {
    constructor ({dubtrackClient, soundcloudClient, models, tracktools}) {
        super();
        this._dubtrack = dubtrackClient;
        this._soundcloud = soundcloudClient;
        this._models = models;
        this._tracktools = tracktools;
    }
    run () {
        this._dubtrack.on('chat-message', this._handleChatMessage.bind(this));
        this._dubtrack.on('track-changed', this._handleTrackChanged.bind(this));
    }
    _handleChatMessage ({username, timestamp, message}) {
        var newMessage = new this._models.Message({
            username, message, date: timestamp
        });
        newMessage.save(err => err && this.emit('error', err));
        this._updateUserSeenInfo(username, timestamp);
    }
    _handleTrackChanged ({username, timestamp, title, originType, originId}) {
        var withPreviousTrackInfoSaved;
        if (this._currentTrack) {
            withPreviousTrackInfoSaved = (callback) =>
                this._currentTrack.save(err => {
                    if (err) return this.emit('error', err);
                    callback();
                });
        } else {
            withPreviousTrackInfoSaved = (callback) => callback();
        }
        withPreviousTrackInfoSaved(() => {
            var titlestamp = this._tracktools.titlestamp(title);
            this._models.Track.findOne({titlestamp}, (err, trackInfo) => {
                if (err) return this.emit('error', err);
                this._updatePlays({
                    username, timestamp, title, originType, originId,
                    totalPlays: trackInfo ? trackInfo.totalPlays + 1 : 1,
                    previousDj: trackInfo && trackInfo.lastDj
                });
                this._updateTrackInfo(trackInfo, titlestamp, username, timestamp);
                this._updateUserPlaybackAndSeenInfo(username, timestamp);
            });
        });
    }
    _updatePlays ({username, timestamp, title, originType, originId, totalPlays, previousDj}) {
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
                title,
                url,
                totalPlays,
                previousDj,
                dj: username,
                date: timestamp
            });
            play.save(err => err && this.emit('error', err));
        });
    }
    _updateTrackInfo (trackInfo, titlestamp, username, timestamp) {
        trackInfo = trackInfo || new this._models.Track({
            titlestamp,
            totalPlays: 0
        });
        trackInfo.totalPlays += 1;
        trackInfo.lastDj = username;
        trackInfo.lastPlay = timestamp;
        this._currentTrack = trackInfo;
    }
    _updateUserPlaybackAndSeenInfo (username, timestamp) {
        this._models.User.findOne({username}, (err, user) => {
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
                    username,
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
                    username,
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