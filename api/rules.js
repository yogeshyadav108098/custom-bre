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

    distance: [`string`, `Date`]

};

const allowedOperators = Object.keys(allowedOperatorsForComparator);

const traitFormat = {
    name: `must`, comparator: `must`, value: `optional`, valueType: `must`, weightage: `must`
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

        if (trait.name == 'and' || trait.name == 'or') {
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

        if ((allowedOperatorsForComparator[trait.comparator] === `distance`) && !trait.value) {
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

        if (trait.name == 'and' || trait.name == 'or') {
            return isDataOk;
        }

        if (data[trait.name] === null) {
            isDataOk = false;
            return isDataOk;
        }


        if (trait.valueType === `Date`) {
            let dataDate = new Date(data[trait.name]);
            if (typeof dataDate != `object` && dataDate.getFullYear() > 0) {
                isDataOk = false;
                return isDataOk;
            }
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

const isDateDistanceAllowed = (date1, date2, yearsAllowed, monthAllowed, daysAllowed) => {
    try {
        date1 = new Date(date1);
        date2 = new Date(date2);
        let timeDifference = Math.abs(date2.getTime() - date1.getTime());
        let differentDays = Math.ceil(timeDifference / (1000 * 3600 * 24));

        if (Math.abs(date1.getFullYear() - date2.getFullYear()) === 0 &&
            Math.abs(date1.getMonth() - date2.getMonth()) === 0 &&
            differentDays === 0) {
                return false;
        }

        if (Math.abs(date1.getFullYear() - date2.getFullYear()) > yearsAllowed) {
            return false;
        }

        if (Math.abs(date1.getMonth() - date2.getMonth()) > monthAllowed) {
            return false;
        }

        if (Math.abs(differentDays) > daysAllowed) {
            return false;
        }

        if (Math.abs(date1.getYear() - date2.getYear()) <= yearsAllowed) {

            if (Math.abs(date1.getMonth() - date2.getMonth()) > 0) {
                return false;
            }

            if (Math.abs(differentDays) > 0) {
                return false;
            }
        }

        if (Math.abs(date1.getMonth() - date2.getMonth()) <= monthAllowed) {
            if (Math.abs(differentDays) > 0) {
                return false;
            }
        }
    }
    catch (exception) {
        console.log(exception);
        return false;
    }
    return true;
}

const calculateWeightageForTraitSet = (dataSet1, dataSet2, rule) => {
    let totalWeightage = 0;
    let highestWeightage = 0;
    let lowestWeightage = 0;
    let traits = rule.traits;
    traits.forEach((trait) => {

        if (trait.name == 'and') {
            if (totalWeightage < lowestWeightage) {
                lowestWeightage = totalWeightage;
            }
            totalWeightage = 0;
            return;
        }

        if (trait.name == 'or') {
            if (totalWeightage > highestWeightage) {
                highestWeightage = totalWeightage;
            }
            totalWeightage = 0;
            return;
        }

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
                if (trait.valueType === `string` && Distance(dataSet1[trait.name], dataSet2[trait.name]) <= trait.value && Distance(dataSet1[trait.name], dataSet2[trait.name]) != 0) {
                    totalWeightage += Number(trait.weightage);
                }
                if (trait.valueType === `Date` && isDateDistanceAllowed(dataSet1[trait.name], dataSet2[trait.name]), trait.value.year, trait.value.month, trait.value.day) {
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