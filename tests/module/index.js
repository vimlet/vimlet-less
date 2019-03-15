var less = require("../../src");

var include = "resources/**/*";
var excludeFolder = "resources/exclude/*";
var output = "output";
var lessF = "resources/less";


// less.render(lessF, output, {clean:true}, function(){
//     console.log("Done!");    
// });


less.render(include, output, {exclude: excludeFolder, clean:true}, function(){
    console.log("Done!");    
});


// less.watch(include, output, {exclude: excludeFolder});