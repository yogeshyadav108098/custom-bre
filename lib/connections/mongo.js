`use strict`;

const Mongoose = require('mongoose');
const Config = require("../../config/mongo");

const MongooseConnection = Mongoose.connection;

MongooseConnection
    .once('open', console.log)
    .on('error', console.error)
    .on('disconnected', console.error);

Mongoose.connect(Config.url, { useNewUrlParser: true, useUnifiedTopology: true })

process.on(`SIGINT`, () => {
    MongooseConnection.close(() => {
        console.log(`Mongo connection closed`);
        process.exit(0)
    });
});

module.exports = Mongoose;