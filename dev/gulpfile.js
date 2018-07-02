const gulp = require("gulp");
const exec = require("child_process").exec;
const del = require("del");
const rename = require("gulp-rename");

gulp.task("clean", (cb) => {
  return del(["../build/**"], {force : true});
});

const buildGenerator = (source, destination) => {
  return () => {
    return gulp.src(source).pipe(gulp.dest(destination));
  };
};


gulp.task("build-libraries", buildGenerator("public/lib/**", "../build/lib/"));
gulp.task("build-stylesheets", buildGenerator("public/css/**", "../build/css/"));
gulp.task("build-javascripts", buildGenerator("public/js/**", "../build/js/"));
gulp.task("build-images"     , buildGenerator("public/images/**", "../build/images/"));
gulp.task("build-html"       , buildGenerator("public/index.html",    "../build/"));
gulp.task("build-license"    , buildGenerator("../LICENSE", "../build/"));
gulp.task("build-gitignore"  , buildGenerator("../.gitignore", "../build/"));
gulp.task("build-readme"     , () => {
  return gulp
    .src("../README_GHPAGES.md")
    .pipe(rename("README.md"))
    .pipe(gulp.dest("../build/"));
});
gulp.task("build", gulp.series("clean", gulp.parallel("build-javascripts", "build-libraries", "build-stylesheets", "build-images", "build-html", "build-readme", "build-license", "build-gitignore")));

gulp.task("test", (cb) =>{
  cb();
});

gulp.task("run", (cb) => {
  exec("node app.js", (err) => {
    if (err) {
      cb(err);
    } else {
      cb();
    }
  });
});

gulp.task("default", gulp.series( "test", "build"));

