const gulp = require("gulp");
const exec = require("child_process").exec;
const del = require("del");

gulp.task("clean", (cb) => {
    return del(["../build/**"], {force : true});
})

const buildGenerator = (source, destination) => {
    return () => {
        return gulp.src(source).pipe(gulp.dest(destination)); 
    };
};



gulp.task("build-stylesheets", buildGenerator("public/stylesheets/**", "../build/stylesheets/"));
gulp.task("build-javascripts", buildGenerator("public/javascripts/**", "../build/javascripts/"));
gulp.task("build-images"     , buildGenerator("public/images/**", "../build/images/"));
gulp.task("build-html"       , buildGenerator("public/index.html",    "../build/"));
gulp.task("build", gulp.series('clean', gulp.parallel('build-javascripts', 'build-stylesheets', 'build-images', 'build-html')));

gulp.task("test", (cb) =>{
    cb();
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

gulp.task("default", gulp.series( "test", "build"));

