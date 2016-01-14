class SkipLongTracks {
    constructor ({client, maxDurationAllowed}) {
        this._client = client;
        this._maxDurationAllowed = maxDurationAllowed;
    }
    run () {
        this._client.on('track-changed', ({duration}) => {
            if (duration > this._maxDurationAllowed) {
                this._client.skipTrack();
            }
        });
    }
}

export default SkipLongTracks;