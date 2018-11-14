var less = require("@vimlet/less");

var include = "resources/**/*";
var excludeFolder = "resources/exclude/*";
var output = "output";
var lessF = "resources/less";


less.render(lessF, output, {clean:true}, function(){
    console.log("Done!");    
});
