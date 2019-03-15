#!/usr/bin/env node

var io = require("@vimlet/commons-io");
var path = require("path");
var fs = require("fs-extra");
var cli = require("@vimlet/cli").instantiate();
var watch = require("./lib/watch");
var less = require("less");
var deasync = require("deasync");



// @functin render (public) [Parse given less files] @param include @param output @param options @param callback
module.exports.render = async function (include, output, options, callback) {
    options = options || {};
    if (options.clean) {        
        await io.deleteFolderRecursiveAsync(output);                
    }
    var totalFiles = 0;
    var rootsArray = io.getFiles(include, options);
    rootsArray.forEach(function (rootObject) {
        totalFiles += rootObject.files.length;
    });
    if (totalFiles === 0) {
        if (callback) {
            callback();
        }
    } else {
        rootsArray.forEach(function (rootObject) {
            rootObject.files.forEach(function (relativePath) {
                var file = path.join(rootObject.root, relativePath);
                var outputFile = path.join(process.cwd(), output, relativePath).replace(".less", ".css");
                render(file, outputFile, function () {
                    console.log(file + " => " + outputFile);
                    totalFiles--;
                    if (totalFiles == 0) {
                        if (callback) {
                            callback();
                        }
                    }
                });
            });
        });
    }
};

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


// @functin renderSync (public) [Render included files and wait for all to finish] @param include @param output @param options
module.exports.renderSync = function (include, output, options) {
    var done = false;
    var data;
    module.exports.render(include, output, options, function cb(res) {
        data = res;
        done = true;
    });
    deasync.loopWhile(function () {
        return !done;
    });
};

// @functin watch (public) [Parse less files from include and keep looking for changes] @param include @param output @param options
module.exports.watch = function (include, output, options) {
    module.exports.render(include, output, options);
    watch.watch(include, output, options);
    if (options && options.watchdirectory) {
        watch.watchDirectory(options.watchdirectory, include, function () {
            module.exports.render(include, output, options);
        });
    }
};

// Command mode
if (!module.parent) {

    function list(value) {
        var result = value.split(",");
        for (var i = 0; i < result.length; i++) {
            result[i] = result[i].trim();
        }
        return result;
    }

    cli
        .value("-i", "--include", "Include patterns", list)
        .value("-e", "--exclude", "Exclude patterns", list)
        .value("-o", "--output", "Output path")
        .flag("-c", "--clean", "Clean output directory")
        .value("-w", "--watch", "Keeps watching for changes")
        .flag("-h", "--help", "Shows help")
        .parse(process.argv);

    var cwd = process.cwd();

    var include = cli.result.include || path.join(cwd, "**/*.*");
    var exclude = cli.result.exclude || "**node_modules**";
    var output = cli.result.output || cwd;
    var clean = cli.result.clean || false;


    var options = {};
    options.exclude = exclude;
    options.clean = clean;

    if (cli.result.help) {
        cli.printHelp();
    } else {
        if (cli.result.watch) {
            if (typeof (cli.result.watch) != "boolean") {
                options.watchdirectory = cli.result.watch;
            }
            module.exports.watch(include, output, options);
        } else {
            module.exports.renderSync(include, output, options);
        }
    }

}