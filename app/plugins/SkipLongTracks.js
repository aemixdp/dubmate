class SkipLongTracks {
    constructor ({client, maxDurationAllowed, maxQueueSize}) {
        this._client = client;
        this._maxDurationAllowed = maxDurationAllowed;
        this._maxQueueSize = maxQueueSize;
    }
    run () {
        this._client.on('track-changed', ({duration}) => {
            var queue = this._client.getQueue();
            if (duration > this._maxDurationAllowed && queue.length > this._maxQueueSize) {
                this._client.skipTrack();
            }
        });
    }
}

export default SkipLongTracks;