/* jshint node:true */

"use strict";

var gulp = require("gulp");
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var deploy = require("gulp-gh-pages");

var opt = {
  outputFolder: "build",

  app: {
    src: ["./index.js", "./ext/utils.js", "./ext/hkdf.js"],
    dest: "daybed.js"
  },
};


gulp.task("dist", function() {
  return browserify(opt.app.src)
    .bundle()
    .pipe(source(opt.app.dest))
    .pipe(gulp.dest(opt.outputFolder));
});

/**
 * Deploy to gh-pages
 */
gulp.task("deploy", ["dist"], function() {
  gulp.src("./build/**")
      .pipe(deploy("git@github.com:spiral-project/daybed.js.git"));
});

gulp.task("default", ["dist"]);
