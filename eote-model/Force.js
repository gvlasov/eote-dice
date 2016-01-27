var Results = require("./Results.js");
var Die = require("./Die.js");

var Force = function () {
};

Force.prototype = new Die(
    "Force",
    [
        [Results.DARK_SIDE],
        [Results.DARK_SIDE],
        [Results.DARK_SIDE],
        [Results.DARK_SIDE],
        [Results.DARK_SIDE],
        [Results.DARK_SIDE],
        [Results.DARK_SIDE, Results.DARK_SIDE],
        [Results.LIGHT_SIDE],
        [Results.LIGHT_SIDE],
        [Results.LIGHT_SIDE, Results.LIGHT_SIDE],
        [Results.LIGHT_SIDE, Results.LIGHT_SIDE],
        [Results.LIGHT_SIDE, Results.LIGHT_SIDE]
    ]
);

module.exports = Force;