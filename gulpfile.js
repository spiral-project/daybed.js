/* jshint node:true */

"use strict";

var gulp = require("gulp");
var browserify = require('browserify');
var source = require('vinyl-source-stream');

var opt = {
  outputFolder: "build",
  app: {
    src: "./index.js",
    dest: "daybed.js"
  },
  bundle: {
    standalone: 'Daybed'
  }
};


gulp.task("dist", function() {
  return browserify(opt.app.src)
    .ignore('xmlhttprequest')
    .bundle(opt.bundle)
    .pipe(source(opt.app.dest))
    .pipe(gulp.dest(opt.outputFolder));
});

gulp.task("default", ["dist"]);
