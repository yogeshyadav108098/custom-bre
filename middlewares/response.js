`use strict`;

const _ = require(`lodash`);

const sendResponse = (req, res, next) => {

    let lastMiddlewareResponse = _.get(req, `locals.lastMiddlewareResponse`, {});
    if (!lastMiddlewareResponse.json || !lastMiddlewareResponse.status) {
        return next(new Error(`Send response called before setting response`));
    }

    return res.status(lastMiddlewareResponse.status).json(lastMiddlewareResponse.json);
};

module.exports = {
    sendResponse
};