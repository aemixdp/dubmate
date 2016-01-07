'use strict';

import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import nunjucks from 'nunjucks';
import soundcloud from 'node-soundcloud';
import YouTube from 'youtube-node';
import LastFM from 'lastfmapi';

import DubtrackClient from './app/DubtrackClient';
import * as models from './app/models';
import config from './config/config';
import setupRoutes from './config/routes';

import ChatCommands from './app/plugins/ChatCommands';
import StatsCollector from './app/plugins/StatsCollector';

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
expressApp.use(express.static(path.join(__dirname, 'public')));

setupRoutes(expressApp);

const nunjucksEnv = nunjucks.configure(path.join(__dirname, 'app', 'views'), {
    express: expressApp,
    noCache: true
});

nunjucksEnv.addGlobal('room', config.dubtrack.room);
nunjucksEnv.addGlobal('chatCommandRegistry', ChatCommands.registry);

const mongooseConnectionOptions = { server: { socketOptions: { keepAlive: 1 } } };
const mongooseConnection = mongoose.connect(config.db, mongooseConnectionOptions).connection;

mongooseConnection.on('error', console.log);
mongooseConnection.on('disconnected', () =>
    mongoose.connect(config.db, mongooseConnectionOptions));

mongooseConnection.once('open', () => {
    dubtrackClient.login((err) => {
        if (err) return console.error(err);
        dubtrackClient.connect();
    });
});

dubtrackClient.on('connected', () =>
    expressApp.listen(process.env.PORT || 3000));

dubtrackClient.on('disconnected', () =>
    setTimeout(() => dubtrackClient.connect(), config.dubtrack.reconnectTimeout));

const chatCommandsPlugin = new ChatCommands({
    dubtrackClient: dubtrackClient,
    soundcloudClient: soundcloud,
    youtubeClient: youtubeClient,
    lastfmClient: lastfmClient
});

const statsCollectorPlugin = new StatsCollector({
    dubtrackClient: dubtrackClient,
    soundcloudClient: soundcloud,
    models: models
});

chatCommandsPlugin.run();
statsCollectorPlugin.run();