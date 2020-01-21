`use strict`;

const Mongoose = require(`mongoose`);

var RulesSchema = Mongoose.Schema({
    ruleSet: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Rules = Mongoose.model(`Rules`, RulesSchema);
module.exports = Rules;