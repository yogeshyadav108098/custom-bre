`use strict`;

const _ = require(`lodash`);
const Uuid = require(`uuid`);
const Express = require(`express`);
const BodyParser = require(`body-parser`);

const App = Express();
const ENV = _.get(process.env, `ENV`);
const PORT = _.get(process.env, `PORT`);

if (!ENV || !PORT) {
    console.log(`Can not start server as ENV/PORT is not set`);
    process.exit(0);
}

// Load Connections
require(`./lib/connections/mongo`);

// Basic middlewares
App.use(BodyParser.json({
    limit: `10mb`
}));
App.use(BodyParser.urlencoded({
    extended: true,
    limit: `10mb`,
    parameterLimit: `5000`
}));
App.use((req, res, next) => {
    _.set(req, `locals.uuid`, Uuid.v4());
    console.log(`${req.locals.uuid} Added unique ID in request`);
    console.log(`${req.locals.uuid} Request Headers ${JSON.stringify(req.headers)}`);
    console.log(`${req.locals.uuid} Request Query ${JSON.stringify(req.query)}`);
    console.log(`${req.locals.uuid} Request Params ${JSON.stringify(req.params)}`);
    console.log(`${req.locals.uuid} Request Body ${JSON.stringify(req.body)}`);
    return next();
});

// Load Controllers
require('./routes')(App);

// Server start
App.listen(_.get(process.env, `PORT`), () => {
    console.info(`Successfully started with environment ${ENV} and port ${PORT}`);
});