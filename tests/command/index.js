var less = "../../src";
var commons = require("@vimlet/commons");


commons.run.exec("node", {"args":[less, "-i", "resources/**/*.*", "-o", "output", "-e", "resources/exclude/*", "-c"]}, function (error, data) {
    if (error) {
      console.error(error);
    } else {
      console.log("done!");
    }
  });

  
// commons.run.exec("node", [less, "-w", "-i", "resources/**/*.*", "-o", "output", "-e", "resources/exclude/*", "-c"], null, null, function (error, data) {
//   if (error) {
//     console.error(error);
//   } else {
//     console.log("Watching!");
//   }
// });