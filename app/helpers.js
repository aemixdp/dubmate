'use strict';

import paginate from 'express-paginate';
import extend from 'util-extend';
import config from '../config/config.js';

function paginatedListView ({view, model, query, paginationOptions, renderOptions}) {
    return (req, res, next) => {
        paginationOptions.page = req.query.page;
        paginationOptions.limit = req.query.limit;
        model.paginate(query || {}, paginationOptions, (err, result) => {
            if (err) return next(err);
            var href = paginate.href(req);
            extend(renderOptions, {
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
            res.render(view, renderOptions);
        });
    }
}

export { paginatedListView };