`use strict`;

const Distance = require('js-levenshtein');

const RulesModel = require(`../ models/rules`);

const allowedOperatorsForComparator = {

    equals: [`string`, `Date`, `number`, `object`],

    greaterThan: [`Date`, `number`],
    greaterThanEquals: [`Date`, `number`],

    smallerThan: [`Date`, `number`],
    smallerThanEquals: [`Date`, `number`],

    like: [`string`],

    below: [`Date`, `number`],
    above: [`Date`, `number`],

    longer: [`string`],
    shorter: [`string`],

    older: [`Date`],
    younger: [`Date`],

    distance: [`string`]

};

const allowedOperators = Object.keys(allowedOperatorsForComparator);

const traitFormat = {
    name: `must`, comparator: `must`, value: `optional` ,valueType: `must`, weightage: `must`
};

const validateRule = (rule) => {
    let isRuleOk = true;

    if (!rule || !rule.traits) {
        isRuleOk = false;
        return isRuleOk;
    }

    const traits = rule.traits;
    if (!traits || !traits.length) {
        isRuleOk = false;
        return isRuleOk;
    }

    traits.every((trait) => {

        if (!trait || !trait.name) {
            isRuleOk = false;
            return isRuleOk;
        }

        if (allowedOperators.indexOf(trait.comparator) < 0) {
            isRuleOk = false;
            return isRuleOk;
        }

        if (typeof trait.weightage != `number`) {
            isRuleOk = false;
            return isRuleOk;
        }

        if (allowedOperatorsForComparator[trait.comparator].indexOf(trait.valueType) < 0) {
            isRuleOk = false;
            return isRuleOk;
        }

        if ((allowedOperatorsForComparator[trait.comparator]  === `distance`) && !trait.value) {
            isRuleOk = false;
            return isRuleOk;
        }

        return isRuleOk;
    });

    return isRuleOk;
}

const getAllRules = (callback) => {
    RulesModel.find({}, (error, result) => {
        if (error) {
            return callback(error);
        }

        if (!result || !result.length) {
            return callback(null, []);
        }

        return callback(null, result.map(rule => {
            return {
                _id: rule._id,
                ruleSet: JSON.parse(Buffer.from(rule.ruleSet, 'base64').toString()),
                created: rule.created,
                updated: rule.updated
            }
        }));
    });
};

const deleteAllRules = (callback) => {
    RulesModel.deleteMany({}, (error, result) => {
        if (error) {
            return callback(error);
        }

        return callback(null, result);
    });
};

const getRuleById = (id, callback) => {
    RulesModel.findOne({ _id: id }, (error, result) => {
        if (error) {
            return callback(error);
        }

        if (!result) {
            return callback(null, {});
        }

        return callback(null, JSON.parse(Buffer.from(result['ruleSet'], 'base64').toString()));
    });
}

const deleteRuleById = (id, callback) => {
    RulesModel.deleteOne({ _id: id }, (error, result) => {
        if (error) {
            return callback(error);
        }

        return callback(null, result);
    });
}

const createRule = (rule, callback) => {

    if (!validateRule(rule)) {
        return callback(new Error(`Validation failed for rule`));
    }

    const ruleJson = {
        ruleSet: Buffer.from(JSON.stringify(rule)).toString('base64')
    };
    RulesModel(ruleJson).save((error, result) => {
        if (error) {
            return callback(error);
        }

        return callback(null, {
            _id: result._id,
            ruleSet: JSON.parse(Buffer.from(result.ruleSet, 'base64').toString()),
            created: result.created,
            updated: result.updated
        });
    });
}

const validateData = (data, rule) => {
    let isDataOk = true;

    let traits = rule.traits;
    traits.every((trait) => {
        if (data[trait.name] === null) {
            isDataOk = false;
            return isDataOk;
        }

        if (trait.valueType !== typeof data[trait.name]) {
            isDataOk = false;
            return isDataOk;
        }

        return isDataOk;
    });

    return isDataOk;
}

const calculateWeightageForTraitSet = (dataSet1, dataSet2, rule) => {
    let totalWeightage = 0;
    let traits = rule.traits;
    traits.forEach((trait) => {
        switch (trait.comparator) {
            case `equals`:
                if (dataSet1[trait.name] === dataSet2[trait.name]) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            case `below`:
            case `greaterThan`:
                if (dataSet1[trait.name] > dataSet2[trait.name]) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            case `greaterThanEquals`:
                if (dataSet1[trait.name] >= dataSet2[trait.name]) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            case `above`:
            case `smallerThan`:
                if (dataSet1[trait.name] < dataSet2[trait.name]) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            case `smallerThanEquals`:
                if (dataSet1[trait.name] <= dataSet2[trait.name]) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            case `like`:
                if (dataSet1[trait.name].includes(dataSet2[trait.name])) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            case `longer`:
                if (dataSet1[trait.name].length > dataSet2[trait.name].length) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            case `shorter`:
                if (dataSet1[trait.name].length < dataSet2[trait.name].length) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            case `distance`:
                if (Distance(dataSet1[trait.name], dataSet2[trait.name]) <= trait.value) {
                    totalWeightage += Number(trait.weightage);
                }
                break;
            default:
                break;
        }
    });
    return totalWeightage;
}

const executeRule = (dataSet1, dataSet2, rule, callback) => {
    if (!validateData(dataSet1, rule)) {
        return callback(new Error(`Validation failed for data`));
    }

    if (!validateData(dataSet2, rule)) {
        return callback(new Error(`Validation failed for data`));
    }

    return callback(null, calculateWeightageForTraitSet(dataSet1, dataSet2, rule));
}

module.exports = {
    getAllRules,
    deleteAllRules,
    getRuleById,
    deleteRuleById,
    createRule,
    executeRule
}