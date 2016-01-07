'use strict';

import mongoose from 'mongoose';
import paginate from 'mongoose-paginate';

const Schema = mongoose.Schema;

const PlaySchema = new Schema({
    title: String,
    url: String,
    totalPlays: Number,
    dj: String,
    previousDj: String,
    date: Date
});

const TrackSchema = new Schema({
    titlestamp: { type: String, index: true, unique: true },
    totalPlays: Number,
    lastDj: String,
    lastPlay: Date
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
const Track = mongoose.model('Track', TrackSchema);
const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

export { Play, Track, User, Message };
