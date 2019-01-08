var less = require("../../src");

var include = "resources/**/*";
var excludeFolder = "resources/exclude/*";
var output = "output";
var lessF = "resources/less";


less.renderSync(include, output, {exclude: excludeFolder});
console.log("DONE");
