'use strict';

import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import nunjucks from 'nunjucks';
import soundcloud from 'node-soundcloud';
import YouTube from 'youtube-node';
import LastFM from 'lastfmapi';

import DubtrackClient from './app/DubtrackClient';
import * as tracktools from './app/tracktools';
import * as models from './app/models';
import config from './config/config';
import rolls from './config/rolls';
import setupRoutes from './config/routes';
import localizer from './config/localization';

import ChatCommands from './app/plugins/ChatCommands';
import ChatStopWords from './app/plugins/ChatStopWords';
import StatsCollector from './app/plugins/StatsCollector';
import SkipLongTracks from './app/plugins/SkipLongTracks';
import VoteBasedSkip from './app/plugins/VoteBasedSkip';

const dubtrackClient = new DubtrackClient({
    username: config.dubtrack.username,
    password: config.dubtrack.password,
    room: config.dubtrack.room
});

const youtubeClient = new YouTube();
youtubeClient.setKey(config.googleApiKey);

const lastfmClient = new LastFM({
    api_key: config.lastfmApiKey
});

soundcloud.init({
    id: config.soundcloudClientId
});

const expressApp = express();

expressApp.set('view engine', 'html');
expressApp.use(cookieParser());
expressApp.use(express.static(path.join(__dirname, 'public')));

expressApp.use((req, res, next) => {
    var locale = req.cookies.locale || 'ru';
    res.locals.locale = locale;
    res.locals.localize = localizer(locale);
    next();
});

setupRoutes(expressApp);

const nunjucksEnv = nunjucks.configure(path.join(__dirname, 'app', 'views'), {
    express: expressApp,
    noCache: true
});

nunjucksEnv.addGlobal('room', config.dubtrack.room);
nunjucksEnv.addGlobal('chatCommandRegistry', ChatCommands.registry);

const mongooseConnectionOptions = { server: { socketOptions: { keepAlive: 1 } } };
const mongooseConnection = mongoose.connect(config.db, mongooseConnectionOptions).connection;

mongooseConnection.on('error', console.error);
mongooseConnection.on('disconnected', () =>
    mongoose.connect(config.db, mongooseConnectionOptions));

mongooseConnection.once('open', () => {
    dubtrackClient.login((err) => {
        if (err) return console.error(err);
        dubtrackClient.connect();
    });
});

dubtrackClient.on('connected', () =>
    expressApp.listen(
        process.env.OPENSHIFT_NODEJS_PORT || 8080,
        process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'));

dubtrackClient.on('disconnected', () =>
    setTimeout(() => dubtrackClient.connect(), config.dubtrack.reconnectTimeout));

dubtrackClient.on('error', console.error);

const chatCommandsPlugin = new ChatCommands({
    dubtrackClient: dubtrackClient,
    soundcloudClient: soundcloud,
    youtubeClient: youtubeClient,
    lastfmClient: lastfmClient,
    rollVariants: rolls,
    models: models,
    tracktools: tracktools,
    localizer: localizer(config.chatbotLocale),
    maxChatCommandsPerMinute: config.maxChatCommandsPerMinute
});

const chatStopWordsPlugin = new ChatStopWords({
    client: dubtrackClient,
    stopWords: config.chatStopWords
});

const statsCollectorPlugin = new StatsCollector({
    dubtrackClient: dubtrackClient,
    soundcloudClient: soundcloud,
    models: models,
    tracktools: tracktools
});

const skipLongTracksPlugin = new SkipLongTracks({
    client: dubtrackClient,
    maxDurationAllowed: config.maxTrackDurationAllowed,
    maxQueueSize: config.maxLongplayQueueAllowed
});

const voteBasedSkip = new VoteBasedSkip({
    client: dubtrackClient,
    skipDelay: config.voteBasedSkipDelay,
    formula: config.voteBasedSkipFormula
});

chatCommandsPlugin.on('error', console.error);
chatStopWordsPlugin.on('error', console.error);
statsCollectorPlugin.on('error', console.error);

chatCommandsPlugin.run();
chatStopWordsPlugin.run();
statsCollectorPlugin.run();
skipLongTracksPlugin.run();
voteBasedSkip.run();