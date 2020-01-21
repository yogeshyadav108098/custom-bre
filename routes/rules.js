`use strict`;

const RuleMiddlewares = require(`../middlewares/rules`);
const ErrorMiddlewares = require(`../middlewares/error`);
const ResponseMiddlewares = require(`../middlewares/response`);

module.exports = (App) => {

    App.get(
        '/rule/:id',
        RuleMiddlewares.getRuleById,
        ResponseMiddlewares.sendResponse,
        ErrorMiddlewares.handleError
    );

    App.delete(
        '/rule/:id',
        RuleMiddlewares.deleteRuleById,
        ResponseMiddlewares.sendResponse,
        ErrorMiddlewares.handleError
    );

    App.get(
        '/rules',
        RuleMiddlewares.getAllRules,
        ResponseMiddlewares.sendResponse,
        ErrorMiddlewares.handleError
    );

    App.delete(
        '/rules',
        RuleMiddlewares.deleteAllRules,
        ResponseMiddlewares.sendResponse,
        ErrorMiddlewares.handleError
    );

    App.post(
        '/rule',
        RuleMiddlewares.createRule,
        ResponseMiddlewares.sendResponse,
        ErrorMiddlewares.handleError
    );

    App.post(
        '/rule/:id/execute',
        RuleMiddlewares.getRuleById,
        RuleMiddlewares.executeRule,
        ResponseMiddlewares.sendResponse,
        ErrorMiddlewares.handleError);
}