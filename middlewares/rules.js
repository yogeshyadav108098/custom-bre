`use strict`;

const _ = require(`lodash`);
const RulesApi = require(`../api/rules`);

module.exports = {
    getAllRules: (req, res, next) => {
        RulesApi.getAllRules((error, rules) => {
            if (error) {
                return next(error);
            }

            _.set(req, `locals.lastMiddlewareResponse`, {
                status: 200,
                json: rules
            });
            return next();
        });
    },

    getRuleById: (req, res, next) => {
        let ruleId = req.params.id;

        if (!ruleId) {
            return next()
        }

        RulesApi.getRuleById(ruleId, (error, rule) => {
            if (error) {
                return next(error);
            }

            _.set(req, `locals.lastMiddlewareResponse`, {
                status: 200,
                json: rule
            });
            return next();
        });
    },

    deleteRuleById: (req, res, next) => {
        let ruleId = req.params.id;

        if (!ruleId) {
            return next()
        }
        RulesApi.deleteRuleById(ruleId, (error, result) => {
            if (error) {
                return next(error);
            }

            if (result.deletedCount > 0) {
                return res.json({
                    message: `Deletion successful`
                });
            }

            _.set(req, `locals.lastMiddlewareResponse`, {
                status: 200,
                json: {
                    message: `No rule with id ${ruleId}`
                }
            });
            return next();
        });
    },

    deleteAllRules: (req, res, next) => {
        RulesApi.deleteAllRules((error, result) => {
            if (error) {
                return next(error);
            }

            _.set(req, `locals.lastMiddlewareResponse`, {
                status: 200,
                json: {
                    message: `Deleted rules ${result.deletedCount}`
                }
            });
            return next();
        });
    },

    createRule: (req, res, next) => {

        if (Array.isArray(req.body)) {
            return next(new Error(`Multi-rule creation is not supported`));
        }

        RulesApi.createRule(req.body, (error, rule) => {
            if (error) {
                return next(error);
            }

            _.set(req, `locals.lastMiddlewareResponse`, {
                status: 201,
                json: rule
            });
            return next();
        });
    },

    executeRule: (req, res, next) => {

        let rule = _.get(req, `locals.lastMiddlewareResponse.json`);
        let dataSet1 = _.get(req, `body.dataSet1`);
        let dataSet2 = _.get(req, `body.dataSet2`);

        if (!dataSet1 || !dataSet2) {
            return next(new Error(`Data not proper for rule execution`));
        }

        RulesApi.executeRule(dataSet1, dataSet2, rule, (error, result) => {
            if (error) {
                return next(error);
            }

            _.set(req, `locals.lastMiddlewareResponse`, {
                status: 200,
                json: {
                    weightage: result
                }
            });
            return next();
        });
    }
}