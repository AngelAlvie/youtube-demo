# Emotion-enabled YouTube Demo

This demo uses Affectiva's JavaScript SDK to analyze your emotions as you watch a YouTube video. Search a YouTube video by keyword or enter its URL, and with your webcam turned on, you'll be able to see your emotions both during the video and during playback. The code is written entirely in JavaScript, HTML, and CSS. [d3](https://d3js.org/) was used to render the emotions graph.

For more information about Affectiva's JavaScript SDK, visit http://developer.affectiva.com/. 

## Try it Now!

Click [here](https://affectiva.github.io/youtube-demo) to try the demo.

## Running the Demo Locally:

### Requirements:

* Python 2.x or higher
* Supported web browser (Google Chrome, Firefox, or Opera)

### Getting Started:

* Install [Python](https://www.python.org/downloads/release/python-2710/)

To test if Python is installed, run the following command on either Command Prompt or Terminal:

```
$ python
```

* Clone the repository on your local machine

* Open Command Prompt/Terminal and navigate to the folder where the source code was cloned
* Run a server with the following command:
* **Important: Be sure to change the API Key in index.js to a key of your own. Follow the instructions [here](https://developers.google.com/youtube/registering_an_application#Create_API_Keys).**
#### Python 2.x

```
$ python -m SimpleHTTPServer 8000 
```

#### Python 3.x

```
$ python -m http.server 8000 
```

Once the server is up, open a web browser and navigate to [http://localhost:8000/](http://localhost:8000/). The demo should start loading.

## Components

This demo is broken down into three components under `js/`.

### graph.js

This component supports simple interfacing with the graph. It supports a number of functions that allows us to initialize a graph, set the scale of the graph, update the graph with new points, and implements handlers for the various buttons linked to the graph. These are all wrapped up in a class object called `Graph`, which only requires the container node to be given to it for it to work.

### player.js

This component implements an asynchronous way of interfacing with the YouTube Player, and should be relatively extensible to any other player you would want to fit. The `AsyncPlayer` object is actually a function that when initialized, takes the following arguments: `message`, `data` and `callback`. There are a number of messages that the player supports, and when it is finished processing those messages, it will call the `callback` with a `message` and `data` of it's own. Here's what it looks like: 
```JavaScript
const player = new AsyncPlayer();

player("load", null, (message, data) => {
  console.log(message);
  if (message === "loaded") {
    playVideo();
  }
});

const playVideo = () => {
  player("play", "dQw4w9WgXcQ", (message, data) => {
    if (message === "video start") {
      console.log("Video is: " + data.video_duration_sec + "  seconds long");
    } else {
      console.log("Something else happened");
    }
  });
}
```
If the player successfully loads, this snippet of code will print `loaded` to the console. The player will then start playing the given video, and report how long the video is to the console, if it starts playing. Here is a list of the messages that can be passed to the player:

* `"load"` - Does not expect data. Callback will be a function that takes `('loaded', null)` as arguments.
* `"play"` - Expects a String that is the YouTube ID of the video you want to play as data. callback will be a function that expects one of these signals:
  * `"video start"` - Accompanying data will be an object including `video_duration_ms`, `start_time` and `video_duration_sec`.
  * `"buffer finished"` - Accompanying data will be the amount of time spent buffering.
  * `"short video"` - signal that notifies the callback that video is too short. Accompanying data is null.
  * `"buffering"` - signal that alerts the callback that the player is starting to buffer again. Accompanying data is null.
  * `"ended"` - signal that the video has ended. Accompanying data is null.
  * `"network fail"` - signal that the network went out during video replay. Accompanying data is null.

### index.js
This is the controller for the main app. It binds together all of the components that make the demo work. It is separated into 4 phases, which correspond to different views on the client side:
* `LOADING` - The demo alerts the user that it is initializing all of the scripts. 
* `SEARCHING` - The demo allows the user to search for a video to play.
* `RECORDING` - The demo is recording your emotion data, and playing the video
* `PLAYBACK` - The demo allows you to move a cursor on the graph around, with accompanying video playback.

These states are accessible through the `Demo.States` enum. You can get the state of the current demo using `Demo.state()`. 

This scripts implements a main `Demo` object that supports a `start()` method which intializes the demo.

#### Supported Browsers

* Chrome 51 or higher
* Firefox 47 or higher
* Opera 37
