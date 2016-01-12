import EventEmitter from 'events';

class ChatStopWords extends EventEmitter {
    constructor ({client, stopWords}) {
        super();
        this._client = client;
        this._stopWords = stopWords;
    }
    run () {
        this._client.on('chat-message', this._handleChatMessage.bind(this));
    }
    _handleChatMessage ({username, message, id}) {
        if (this._lastMessageUsername != username) {
            this._lastMessageGroupId = id;
            this._lastMessageUsername = username;
        }
        for (var stopWord of this._stopWords) {
            if (message.indexOf(stopWord) != -1) {
                this._client.deleteChatMessage(this._lastMessageGroupId);
                return;
            }
        }
    }
}

export default ChatStopWords;