const gulp = require("gulp");
const exec = require("child_process").exec;
const del = require("del");

gulp.task("clean", (cb) => {
    return del(["../build/**"], {force : true});
})

const buildGenerator = (src, dest) => {
    return () => {
      gulp
      .src(src)
      .pipe(gulp.dest(dest));
    }
};
  
gulp.task("build", ["clean"], () => {
   buildGenerator("public/stylesheets/*", "../build/stylesheets/")();
   buildGenerator("public/javascripts/*", "../build/javascripts/")();
   buildGenerator("public/javascripts/*", "../build/images/")();
   buildGenerator("public/index.html",    "../build/")();

   return 0;
});

gulp.task("test", () =>{
    return 0;
});

gulp.task("run", (cb) => {
    exec('node app.js', (err) => {
        if (err) {
            cb(err)
        } else {
            cb();
        }
    });
});

gulp.task("default", ["build", "test"] ,() => {
    return 0;
});

