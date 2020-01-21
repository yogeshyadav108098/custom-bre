`use strict`;

const handleError = (error, req, res, next) => {
    let response = {
        message: error.message,
        stack: error.stack
    };
    return res.status(500).json(response);
}

module.exports = { handleError };