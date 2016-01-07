'use strict';

import paginate from 'express-paginate';
import config from '../config/config.js';

function paginatedListView (view, model, options) {
    return (req, res, next) => {
        options.page = req.query.page;
        options.limit = req.query.limit;
        model.paginate({}, options, (err, result) => {
            if (err) return next(err);
            var href = paginate.href(req);
            res.render(view, {
                model: result.docs,
                pages: paginate.getArrayPages(req)(
                    config.frontend.paginatorPageCount,
                    result.pages,
                    req.query.page
                ),
                currentPage: req.query.page,
                totalPages: result.pages,
                prevHref: href(true),
                nextHref: href()
            });
        });
    }
}

export { paginatedListView };