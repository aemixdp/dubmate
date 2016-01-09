'use strict';

import {Play, User, Message} from './models.js';
import * as helpers from './helpers.js';

const home = {
    about: (req, res) => res.render('about', { route: 'about' }),
    commands: (req, res) => res.render('commands', { route: 'commands' })
};

const plays = {
    list: helpers.paginatedListView({
        view: 'plays',
        model: Play,
        paginationOptions: { sort: { date: -1 } },
        renderOptions: { route: 'plays' }
    })
};

const messages = {
    list: helpers.paginatedListView({
        view: 'messages',
        model: Message,
        paginationOptions: { sort: { date: -1 } },
        renderOptions: { route: 'messages' }
    })
};

const users = {
    list: helpers.paginatedListView({
        view: 'users',
        model: User,
        paginationOptions: { sort: { plays: -1 } },
        renderOptions: { route: 'users' }
    }),

    details (req, res, next) {
        User.findOne({ username: req.params.username }, (err, user) => {
            if (err) return next(err);
            res.render('users', {
                route: 'users',
                model: [user]
            });
        });
    }
};

export {home, plays, messages, users};