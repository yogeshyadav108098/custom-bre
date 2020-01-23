`use strict`;

const Request = require('request');
const Distance = require('js-levenshtein');

const RulesModel = require(`../ models/rules`);

const allowedOperatorsForComparator = {

    equals: [`string`, `Date`, `number`],

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
const allowedRuleTypes = ['NORMAL_BRE', 'EVENT_BASED_BRE', 'CUSTOM_REQ_1'];

const traitFormat = {
    name: `must`, comparator: `must`, value: `optional`, valueType: `must`, weightage: `must`
};

const allowedEventTypes = ['API_HIT'];

const executeNormalRuleData = (data, rule) => {
    let traits = rule.traits;
    let isRulePassed = true;

    traits.forEach((trait) => {

        if (trait.name == 'or') {
            isRulePassed = true;
            return;
        }

        if (trait.valueType === 'Date') {
            trait.value = new Date(trait.value);
            data[trait.name] = new Date(data[trait.name]);
        }

        switch (trait.comparator) {
            case `equals`:
                if (trait.valueType === 'Date') {
                    if (data[trait.name].getTime() != trait.value.getTime()) {
                        isRulePassed = false;
                    }
                    break;
                }
                if (data[trait.name] != trait.value) {
                    isRulePassed = false;
                }
                break;
            case `below`:
            case `greaterThan`:
                if (data[trait.name] <= trait.value) {
                    isRulePassed = false;
                }
                break;
            case `greaterThanEquals`:
                if (data[trait.name] < trait.value) {
                    isRulePassed = false;
                }
                break;
            case `above`:
            case `smallerThan`:
                if (data[trait.name] >= trait.value) {
                    isRulePassed = false;
                }
                break;
            case `smallerThanEquals`:
                if (data[trait.name] > trait.value) {
                    isRulePassed = false;
                }
                break;
            case `like`:
                if (data[trait.name].includes(trait.value)) {
                    isRulePassed = false;
                }
                break;
            case `longer`:
                if (data[trait.name].length > trait.value.length) {
                    isRulePassed = false;
                }
                break;
            case `shorter`:
                if (data[trait.name].length < trait.value.length) {
                    isRulePassed = false;
                }
                break;
            case `distance`:
                if (trait.valueType === `string` && Distance(data[trait.name], trait.value) > trait.comparatorValue) {
                    isRulePassed = false;
                }
                if (trait.valueType === `Date` && !isDateDistanceAllowed(data[trait.name], trait.value, trait.value.year, trait.value.month, trait.value.day)) {
                    isRulePassed = false;
                }
                break;
            default:
                break;
        }
    });
    return isRulePassed;
}

const executeEventRuleData = (data, rule) => {
    let traits = rule.traits;
    let isRulePassed = true;

    traits.forEach((trait) => {

        if (trait.name == 'or') {
            isRulePassed = true;
            return;
        }

        if (trait.valueType === 'Date') {
            trait.value = new Date(trait.value);
            data[trait.name] = new Date(data[trait.name]);
        }

        switch (trait.comparator) {
            case `equals`:
                if (trait.valueType === 'Date') {
                    if (data[trait.name].getTime() != trait.value.getTime()) {
                        isRulePassed = false;
                    }
                    break;
                }
                if (data[trait.name] != trait.value) {
                    isRulePassed = false;
                }
                break;
            case `below`:
            case `greaterThan`:
                if (data[trait.name] <= trait.value) {
                    isRulePassed = false;
                }
                break;
            case `greaterThanEquals`:
                if (data[trait.name] < trait.value) {
                    isRulePassed = false;
                }
                break;
            case `above`:
            case `smallerThan`:
                if (data[trait.name] >= trait.value) {
                    isRulePassed = false;
                }
                break;
            case `smallerThanEquals`:
                if (data[trait.name] > trait.value) {
                    isRulePassed = false;
                }
                break;
            case `like`:
                if (data[trait.name].includes(trait.value)) {
                    isRulePassed = false;
                }
                break;
            case `longer`:
                if (data[trait.name].length > trait.value.length) {
                    isRulePassed = false;
                }
                break;
            case `shorter`:
                if (data[trait.name].length < trait.value.length) {
                    isRulePassed = false;
                }
                break;
            case `distance`:
                if (trait.valueType === `string` && Distance(data[trait.name], trait.value) > trait.comparatorValue) {
                    isRulePassed = false;
                }
                if (trait.valueType === `Date` && !isDateDistanceAllowed(data[trait.name], trait.value, trait.value.year, trait.value.month, trait.value.day)) {
                    isRulePassed = false;
                }
                break;
            default:
                break;
        }
    });

    if (isRulePassed) {
        console.log('Executing event');
        if (rule.event.eventType === 'API_HIT') {
            Request(rule.event.eventData, (error, body, result) => {
                console.log(result);
            });
        }
    }

    return isRulePassed;
}

const executeCustomReq1RuleData = (data, rule) => {
    let dataSet1 = data.dataSet1;
    let dataSet2 = data.dataSet2;
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

const validateNormalRuleData = (data, rule) => {
    let traits = rule.traits;

    let isRulePassed = true;
    traits.every((trait) => {
        if (trait.name === 'or') {
            return true;
        }

        if (data[trait.name] === null) {
            isRulePassed = false;
            return false;
        }

        if (trait.valueType === `Date`) {
            let dataDate = new Date(data[trait.name]);
            if (typeof dataDate != `object` || dataDate.getFullYear() < 0) {
                isRulePassed = false;
                return false;
            }
            return true;
        }

        if (trait.valueType !== typeof data[trait.name]) {
            isRulePassed = false;
            return false;
        }
        return true;
    });

    return isRulePassed;
}

const validateEventRuleData = (data, rule) => {
    let traits = rule.traits;

    let isRulePassed = true;
    traits.every((trait) => {
        if (trait.name === 'or') {
            return true;
        }

        if (data[trait.name] === null) {
            isRulePassed = false;
            return false;
        }

        if (trait.valueType === `Date`) {
            let dataDate = new Date(data[trait.name]);
            if (typeof dataDate != `object` || dataDate.getFullYear() < 0) {
                isRulePassed = false;
                return false;
            }
            return true;
        }

        if (trait.valueType !== typeof data[trait.name]) {
            isRulePassed = false;
            return false;
        }

        return true;
    });

    return isRulePassed;
}

const validateCustomReq1RuleData = (data, rule) => {
    let dataSet1 = data.dataSet1;
    let dataSet2 = data.dataSet2;
    let isDataOk = true;

    let traits = rule.traits;
    traits.every((trait) => {

        if (trait.name == 'and' || trait.name == 'or') {
            return isDataOk;
        }

        if (dataSet1[trait.name] === null) {
            isDataOk = false;
            return isDataOk;
        }

        if (trait.valueType === `Date`) {
            let dataDate = new Date(dataSet1[trait.name]);
            if (typeof dataDate != `object` && dataDate.getFullYear() > 0) {
                isDataOk = false;
                return isDataOk;
            }

            let dataDate2 = new Date(dataSet2[trait.name]);
            if (typeof dataDate != `object` && dataDate2.getFullYear() > 0) {
                isDataOk = false;
                return isDataOk;
            }

            return isDataOk;
        }

        if (trait.valueType !== typeof dataSet1[trait.name]) {
            isDataOk = false;
            return isDataOk;
        }

        return isDataOk;
    });

    return isDataOk;
}

const validateCustomReq1Trait = (trait) => {
    if (!trait) {
        return false;
    }

    if (!trait.name) {
        return false;
    }

    if (trait.name == 'and' || trait.name == 'or') {
        return true;
    }

    if (allowedOperators.indexOf(trait.comparator) < 0) {
        return false;
    }

    if (typeof trait.weightage != `number`) {
        return false;
    }

    if (allowedOperatorsForComparator[trait.comparator].indexOf(trait.valueType) < 0) {
        return false;
    }

    if ((allowedOperatorsForComparator[trait.comparator] === `distance`) && !trait.value) {
        return false;
    }

    return true;
}

const validateEventBasedTrait = (trait) => {
    if (!trait) {
        return false;
    }

    if (!trait.name) {
        return false;
    }

    if (trait.name === 'or') {
        return true;
    }

    if (allowedOperators.indexOf(trait.comparator) < 0) {
        return false;
    }

    if (trait.comparator === 'distance' && trait.comparatorValue === null) {
        return false;
    }

    if (!trait.valueType) {
        return false;
    }

    if (!trait.value) {
        return false;
    }

    return true;
}

const validateNormalTrait = (trait) => {
    if (!trait) {
        return false;
    }

    if (!trait.name) {
        return false;
    }

    if (trait.name === 'or') {
        return true;
    }

    if (allowedOperators.indexOf(trait.comparator) < 0) {
        return false;
    }

    if (trait.comparator == 'distance' && !trait.comparatorValue) {
        return false;
    }

    if (!trait.valueType) {
        return false;
    }

    if (!trait.value) {
        return false;
    }

    console.log('here');
    return true;
}

const validateRule = (rule) => {

    if (!rule || !rule.traits || !rule.ruleType) {
        return false;
    }

    let ruleType = rule.ruleType;
    if (allowedRuleTypes.indexOf(ruleType) < 0) {
        return false;
    }

    const traits = rule.traits;
    if (!traits || !traits.length) {
        return false;
    }

    let isRulePassed = true;
    traits.every((trait) => {
        isRulePassed = ruleTypeToTraitValidateMap[ruleType](trait);
        return isRulePassed;
    });

    if (rule.ruleType === 'EVENT_BASED_BRE') {
        if (!rule.event || (allowedEventTypes.indexOf(rule.event.eventType) < 0) || !rule.event.eventData) {
            return false;
        }
    }

    return isRulePassed;
}

const ruleTypeToTraitValidateMap = {
    NORMAL_BRE: validateNormalTrait,
    EVENT_BASED_BRE: validateEventBasedTrait,
    CUSTOM_REQ_1: validateCustomReq1Trait
}

const ruleTypeToDataValidateMap = {
    NORMAL_BRE: validateNormalRuleData,
    EVENT_BASED_BRE: validateEventRuleData,
    CUSTOM_REQ_1: validateCustomReq1RuleData
}

const ruleTypeToExecuteRuleMap = {
    NORMAL_BRE: executeNormalRuleData,
    EVENT_BASED_BRE: executeEventRuleData,
    CUSTOM_REQ_1: executeCustomReq1RuleData
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


const executeRule = (data, rule, callback) => {
    // Validate data
    ruleTypeToDataValidateMap[rule.ruleType](data, rule);

    // Execute rule
    return callback(null, ruleTypeToExecuteRuleMap[rule.ruleType](data, rule));
}

module.exports = {
    getAllRules,
    deleteAllRules,
    getRuleById,
    deleteRuleById,
    createRule,
    executeRule
}