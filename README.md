# Emotion-enabled YouTube Demo

[![Build Status](https://travis-ci.org/AngelAlvie/youtube-demo.svg?branch=gh-pages)](https://travis-ci.org/AngelAlvie/youtube-demo)

This demo uses Affectiva's JavaScript SDK to analyze your emotions as you watch a YouTube video. Search a YouTube video by keyword or enter its URL, and with your webcam turned on, you'll be able to see your emotions both during the video and during playback. The code is written entirely in JavaScript, HTML, and CSS. [d3](https://d3js.org/) was used to render the emotions graph.

For more information about Affectiva's JavaScript SDK, visit http://developer.affectiva.com/. 

## Try it Now!

Click [here](https://affectiva.github.io/youtube-demo) to try the demo.

## Workflow

This demo is maintained using Travis CI for automated building, testing, and deployment. This demo also uses `gulp.js v4` in order to build. You can look at the example code in the `gh-pages` branch. If you want to look at the development code, switch to the `development` branch. 

There you will see a `dev` folder. This folder contains the configurations need to run the demo files locally, and build the files to a `build` folder. We are using `node` to host the server from the `dev` folder. `npm` is required to install the development dependencies for this project:

```bash
$ cd dev
$ npm install
$ npm start
```
Going to `localhost:8080` in your favorite browser will then load the demo locally. 

If you want to develop on this project, please commit your changes to the `development` branch, then enable Travis CI to run the test and build scripts. Once this is finished, and if the build is successful, then Travis will auto deploy to GiHub Pages, using the `$GITHUB_TOKEN` that is configured in your Travis CI build settings. See the [Travis CI Documentation](https://docs.travis-ci.com/user/deployment/pages/) for more information about this step.

#### Supported Browsers

* Chrome 51 or higher
* Firefox 47 or higher
* Opera 37
