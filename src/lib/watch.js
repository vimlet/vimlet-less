var watch = require('glob-watcher');
var path = require("path");
var io = require("@vimlet/commons-io");
var fs = require("fs-extra");
var less = require("less");

exports.watch = function (include, output, options) {
  options = options || {};
  options.clean = false;
  var watcher = watch(include, {
    events: ['add', 'change', 'unlink', 'addDir', 'unlinkDir']
  });
  watcher.on('change', async function (filePath, stat) {
    var excluded = await isExcluded(options.exclude, filePath);
    if (!excluded) {
      // Relative output is where the template will be saved after parsed
      var relativeOutput = await getRelativeOutput(include, output, filePath);
      var file = path.resolve(filePath);
      var outputFile = path.join(relativeOutput, path.basename(filePath)).replace(".less", ".css");
      render(file, outputFile, function () {
        console.log("Changed --> ", filePath + " => " + path.join(relativeOutput, path.basename(filePath)).replace(".less", ".css"));
      });
    }
  });
  watcher.on('add', async function (filePath, stat) {
    var excluded = await isExcluded(options.exclude, filePath);
    if (!excluded) {
      // Relative output is where the template will be saved after parsed
      var relativeOutput = await getRelativeOutput(include, output, filePath);
      // Parse modified file      
      var file = path.resolve(filePath);
      outputFile = path.join(relativeOutput, path.basename(filePath)).replace(".less", ".css");
      render(file, outputFile, function () {
        console.log("Added --> ", filePath + " => " + path.join(relativeOutput, path.basename(filePath)));
      });
    }
  });
  watcher.on('unlink', async function (filePath, stat) {
    var excluded = await isExcluded(options.exclude, filePath);
    if (!excluded) {
      // Relative output is where the template will be saved after parsed
      var relativeOutput = await getRelativeOutput(include, output, filePath, true);
      var parsedPath = path.join(relativeOutput, path.basename(filePath).replace(".less", ".css"));
      fs.pathExists(parsedPath, function (err, exists) {
        if (!err) {
          fs.remove(parsedPath, function () {
            console.log("Removed --> ", parsedPath);
          });
        }
      });
    }
  });
  watcher.on('addDir', async function (filePath, stat) {
    var relativeOutput = await getRelativeOutput(include, output, filePath);
    fs.mkdirs(path.join(relativeOutput, path.basename(filePath)), function () {
      console.log("Folder created --> ", filePath, "=>", path.join(relativeOutput, path.basename(filePath)));
    });
  });
  watcher.on('unlinkDir', async function (filePath, stat) {
    var relativeOutput = await getRelativeOutput(include, output, filePath, true);
    fs.remove(path.join(relativeOutput, path.basename(filePath)), function () {
      console.log("Folder removed --> ", path.join(relativeOutput, path.basename(filePath)));
    });
  });
  watcher.on('error', async function (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') {
      // Deleting an empty folder doesn't fire on windows
    } else {
      broadcastErr(error);
    }
  });
};

exports.watchDirectory = function (include, exclude, callback) {
  var watcher = watch(include, {
    events: ['add', 'change', 'unlink', 'unlinkDir']
  });
  watcher.on('change', async function (filePath, stat) {
    var excluded = await isExcluded(exclude, filePath);
    if (!excluded) {
      console.log("Changed --> ", filePath);
      callback();
    }
  });
  watcher.on('add', async function (filePath, stat) {
    var excluded = await isExcluded(exclude, filePath);
    if (!excluded) {
      console.log("Added --> ", filePath);
      callback();
    }
  });
  watcher.on('unlink', async function (filePath, stat) {
    var excluded = await isExcluded(exclude, filePath);
    if (!excluded) {
      console.log("Removed --> ", filePath);
      callback();
    }
  });
  watcher.on('unlinkDir', async function (filePath, stat) {
    var excluded = await isExcluded(exclude, filePath);
    if (!excluded) {
      console.log("Directory removed --> ", filePath);
      callback();
    }
  });
  watcher.on('error', function (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') {
      // Deleting an empty folder doesn't fire on windows
    } else {
      broadcastErr(error);
    }
  });
};


/*
@function getRelativeOutput [Get path relative to output]
@param include [Include patterns]
@param output
@param filePath
@param deleted [Flag to know if the file was deleted so it skips files in pattern check]
*/
async function getRelativeOutput(include, output, filePath, deleted) {
  return new Promise(async function (resolve, reject) {
    var relativeOutput;
    if (!Array.isArray(include)) {
      var inPattern = await io.isInPattern(filePath, include, null);
      if (inPattern || deleted) {
        var rootFromPattern = await io.getRootFromPattern(include);
        // Relative output is where the template will be saved after parse
        relativeOutput = path.dirname(path.relative(rootFromPattern, filePath));
        relativeOutput = path.join(output, relativeOutput);
      }
    } else {
      for (const incl of include) {
        var inPattern = await io.isInPattern(filePath, incl, null);
        if (inPattern || deleted) {
          var rootFromPattern = await io.getRootFromPattern(incl);
          // Relative output is where the template will be saved after parse
          relativeOutput = path.dirname(path.relative(rootFromPattern, filePath));
          relativeOutput = path.join(output, relativeOutput);
        }
      }
    }
    resolve(relativeOutput);
  });
}

/*
@function isExcluded [Check if a file is excluded. This function is used because watch doesn't accept exclude patterns]
@param excluded [exclude patterns]
@param filePath
@return boolean
*/
async function isExcluded(excluded, filePath) {
  return new Promise(async function (resolve, reject) {
    if (!excluded) {
      resolve(false);
    }
    if (!Array.isArray(excluded)) {
      var inPattern = await io.isInPattern(filePath, excluded, null);
      resolve(inPattern);
    } else {
      var isIn = false;
      for (const excl of excluded) {
        var inPattern = await io.isInPattern(filePath, excl, null);
        if (inPattern) {
          isIn = true;
        }
      }
      resolve(isIn);
    }
  });
}


// @functin render (private) [Parse single less file] @param file @param output @param callback
function render(file, output, callback) {
  fs.readFile(file, function (error, data) {
    less.render(
      data.toString(), {
        filename: file
      },
      function (e, out) {
        if (out && out.css) {
          fs.mkdirs(path.dirname(output), function (error) {
            if (!error) {
              fs.writeFile(output, out.css, function (error, data) {
                if (!error) {
                  if (callback) {
                    callback();
                  }
                } else {
                  console.log("Error " + file);
                }
              });
            } else {
              console.log("Error " + file);
            }
          });
        } else {
          if (callback) {
            callback();
          }
        }
      });
  });
}