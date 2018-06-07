const gulp = require("gulp");


gulp.task("build", (cb) => {
    cb();
});


gulp.task("test", ["build"], (cb) => {
    cb();
});

gulp.task("run", ["build", "test"], (cb) => {
    cb();
});

gulp.task("default", ["build", "test", "run"] ,() => {
    return 0;
});