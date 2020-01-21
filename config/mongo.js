`use strict`;

const mongoConfig = {
    development: {
        url: "mongodb://127.0.0.1:27017/customBre"
    },
    production: {
        url: "mongodb://127.0.0.1:27017/customBre"
    }
}

module.exports = mongoConfig[process.env.ENV];