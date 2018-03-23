var gulp = require('gulp')

var babelify = require('babelify')
var browserify = require("browserify")
var watchify = require("watchify")

var rename = require('gulp-rename')
var sourcemaps = require('gulp-sourcemaps')

var source = require('vinyl-source-stream')
var buffer = require('vinyl-buffer')

function map_error(err) {
  if (err.fileName) {
    console.log(
      err.name,
      err.fileName.replace(__dirname + '/src/', ''),
      err.lineNumber,
      err.columnNumber || err.column,
      err.description
    )
  } else {
    console.log(err.name, err.message)
  }
}

function bundle_js(bundler) {
  return bundler.bundle()
    .on('error', map_error)
    .pipe(source('./src/app.js'))
    .pipe(buffer())
    // .pipe(gulp.dest('./dist'))
    .pipe(rename('bundle.js'))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'))
}

gulp.task('watchify', function () {
  // var args = merge(watchify.args, { debug: true })
  var bundler = watchify(browserify('./src/app.js', { debug: true })).transform(babelify, { /* opts */ })
  bundle_js(bundler)

  bundler.on('update', function () {
    bundle_js(bundler)
  })
})

gulp.task('default', function() {
  // var bundler = browserify('./src/app.js', { debug: true }).transform(babelify, {/* options */ });
  var bundler = browserify('./src/app.js').transform(babelify, {/* options */ })

  try {
    bundler.bundle()
      .on('error', map_error)
      .pipe(source('./src/app.js'))
      .pipe(buffer())
      .pipe(rename('bundle.js'))
      .pipe(gulp.dest('./dist'))
  } catch (err) {

  }
})
