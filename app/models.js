'use strict';

import mongoose from 'mongoose';
import paginate from 'mongoose-paginate';

const Schema = mongoose.Schema;

const PlaySchema = new Schema({
    title: String,
    url: String,
    username: String,
    date: Date
});

const UserSchema = new Schema({
    username: { type: String, index: true, unique: true },
    plays: Number,
    firstSeen: Date,
    lastSeen: Date,
    firstPlay: Date,
    lastPlay: Date
});

const MessageSchema = new Schema({
    username: String,
    message: String,
    date: Date
});

PlaySchema.plugin(paginate);
UserSchema.plugin(paginate);
MessageSchema.plugin(paginate);

const Play = mongoose.model('Play', PlaySchema);
const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

export { Play, User, Message };
