class VoteBasedSkip {
    constructor ({client, skipDelay, formula}) {
        this._client = client;
        this._skipDelay = skipDelay;
        this._formula = formula;
    }
    run () {
        this._woots = new Set();
        this._mehs = new Set();
        this._neutrals = new Set();
        this._client.on('vote', ({username, type}) => {
            if (type == 'updub') {
                this._woots.add(username);
                this._mehs.delete(username);
                this._neutrals.delete(username);
            } else {
                this._mehs.add(username);
                this._woots.delete(username);
                this._neutrals.delete(username);
            }
            var shouldBeSkipped = this._formula({
                woots: this._woots.size,
                mehs: this._mehs.size,
                neutrals: this._neutrals.size
            });
            if (shouldBeSkipped) {
                this._skipTask = this._skipTask || setTimeout(
                    () => this._client.skipTrack(),
                    this._skipDelay
                );
            } else {
                clearTimeout(this._skipTask);
                this._skipTask = null;
            }
        });
        this._client.on('track-changed', () => {
            clearTimeout(this._skipTask);
            this._skipTask = null;
            this._woots.clear();
            this._mehs.clear();
            this._neutrals.clear();
            for (var userModel of this._client.getUsers()) {
                this._neutrals.add(userModel.username);
            }
        });
    }
}

export default VoteBasedSkip;