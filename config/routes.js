'use strict';

import {home, plays, users, messages} from '../app/controllers';
import paginate from 'express-paginate';
import config from './config';

const paginated = paginate.middleware(config.frontend.resultsPerPage, 20);

export default (app) => {
    app.get('/', home.about);
    app.get('/commands', home.commands);
    app.get('/plays', paginated, plays.list);
    app.get('/users', paginated, users.list);
    app.get('/users/:username', users.details);
    app.get('/messages', paginated, messages.list);
};
