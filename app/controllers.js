'use strict';

import {Play, User, Message} from './models.js';
import * as helpers from './helpers.js';

const home = {
    about: (req, res) => res.render('about', {}),
    commands: (req, res) => res.render('commands', {})
};

const plays = {
    list: helpers.paginatedListView('plays', Play, {
        sort: { date: -1 }
    })
};

const messages = {
    list: helpers.paginatedListView('messages', Message, {
        sort: { date: -1 }
    })
};

const users = {
    list: helpers.paginatedListView('users', User, {
        sort: { plays: -1 }
    }),

    details (req, res, next) {
        User.findOne({ username: req.params.username }, (err, user) => {
            if (err) return next(err);
            res.render('users', { model: [user] });
        });
    }
};

export {home, plays, messages, users};