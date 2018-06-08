# Emotion-enabled YouTube Demo

[![Build Status](https://travis-ci.org/AngelAlvie/youtube-demo.svg?branch=gh-pages)](https://travis-ci.org/AngelAlvie/youtube-demo)

This demo uses Affectiva's JavaScript SDK to analyze your emotions as you watch a YouTube video. Search a YouTube video by keyword or enter its URL, and with your webcam turned on, you'll be able to see your emotions both during the video and during playback. The code is written entirely in JavaScript, HTML, and CSS. [d3](https://d3js.org/) was used to render the emotions graph.

For more information about Affectiva's JavaScript SDK, visit http://developer.affectiva.com/. 

## Try it Now!

Click [here](https://affectiva.github.io/youtube-demo) to try the demo.

## Workflow

This demo is maintained using Travis CI for automated build, test, and deployment. To plainly inspect the files, simply take a look at the following files:
* index.html
* index.js
* stylesheet.css (We are using Bootstrap with slight CSS level modification) 

All other files are needed for building these files, which are composed of the core of the demo. We are using `gulp` to run the build, test, and server configurations.

 

#### Supported Browsers

* Chrome 51 or higher
* Firefox 47 or higher
* Opera 37
