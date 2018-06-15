/** Here I want to define a Asynchronous Player object that supports a number of signals that can be sent to it
 */
function AsyncPlayer() {
  // This represents a closure, where I can define all of my variables that I need.
  let player = null;
  const VIDEO_HEIGHT = 510;
  const VIDEO_WIDTH = 853;
  const VIDEO_VOLUME = 50;
  const VIDEO_LENGTH_THRESHOLD = 5;

  let buffer_start_time_ms = 0;
  let video_duration_sec = 0;
  let video_duration_ms = 0;
  let start_time = 0;
  let playing = false;

  const initializeYouTubePlayer = function(cb) {
    player = new YT.Player("player", {
      height: VIDEO_HEIGHT,
      width: VIDEO_WIDTH,
      playerVars: {
        "controls": 0,
        "iv_load_policy": 3,
        "rel": 0,
        "showinfo": 0
      },
      events: {
        "onPlayerReady": onPlayerReady(cb)
      }
    });
  };

  const onPlayerReady = (cb) => (e) => {
    cb("loaded");
  };

  const onPlayerError = (cb) => (e) => {
    player.stopVideo();
    cb("error", null);
  };

  const onPlayerStateChange = (cb) => (e) => {
    var status = event.data;
    if (status === YT.PlayerState.PLAYING) {
      if (status === YT.PlayerState.PLAYING) {
        video_duration_sec = player.getDuration();
        if (video_duration_sec > 0) {
          if (video_duration_sec > VIDEO_LENGTH_THRESHOLD) {
            if (start_time > 0) {
              var buffer_time = Date.now() - buffer_start_time_ms;
              cb("buffer finished", buffer_time);
            } else {
              start_time = Date.now();
              player.setVolume(VIDEO_VOLUME);
              video_duration_ms = video_duration_sec * 1000;
              cb("video start", video_duration_sec); // pass duration back to the callback
            }
          } else { // video loads and starts playing but is too short
            player.stopVideo();
            cb("short video", null);
          }
        }
      } else if (status === YT.PlayerState.BUFFERING && video_duration_sec > VIDEO_LENGTH_THRESHOLD) {
        cb("buffering",null);
      }
    } else if (status === YT.PlayerState.ENDED) {
      cb("ended", null);
    } else if (status === YT.PlayerState.CUED && video_duration_sec > VIDEO_LENGTH_THRESHOLD && playing) { // loss of Internet while playing video
      cb("network fail", null);
    }
    // make cursor less buggy while video is paused
    if (status === YT.PlayerState.PLAYING) {
      playing = true;
    } else {
      playing = false;
    }
  };

  return (message, data=null, cb = (message, data)=>{}) => {
    //Handle Asynchronous messages
    if (message === "load") {
      // Do the asynchronous loading, and notify the cb when finished
      var tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      // I want to defer the resolution of this promise to the initialize callback of the youtube player
      window.onYouTubeIframeAPIReady = initializeYouTubePlayer(cb); 
    } else if (message === "play") {
      player.addEventListener("onStateChange", onPlayerStateChange(cb));
      player.addEventListener("onPlayerError", onPlayerError(cb));
      player.loadVideoById(data); // we assume that data is a video id
    } else if (message === "seek") {
      player.seekTo(data);        // we assume that data is a time
      cb("seeked", null);
    } else if (message === "pause"){    
      player.pauseVideo();
      cb("paused", null);
    } else if (message === "resume") {
      player.playVideo();
      cb("playing", null);
    }
    // Handle Synchronous messages
    if (message === "getVideoDurationSec") {
      return video_duration_sec;
    } else if (message === "getVideoDurationMs") {
      return video_duration_ms;
    } else if (message === "getStartTime") {
      return start_time;
    } else if (message === "getPlayingState") {
      return playing;
    } else if (message === "getCurrentTime") {
      return player.getCurrentTime();
    }
  };
}

/*
function Player() {
  var self = this;
  var player = null;
  var VIDEO_HEIGHT = 510;
  var VIDEO_WIDTH = 853;
  var VIDEO_VOLUME = 50;
  var VIDEO_LENGTH_THRESHOLD = 5;

  var buffer_start_time_ms = 0;
  this.video_duration_sec = 0;
  this.video_duration_ms = 0;
  this.start_time = 0;
  this.playing = false;
  
  this.initializeYouTubePlayer = (resolve, reject) => {
    return function() {
      player = new YT.Player("player", {
        height: VIDEO_HEIGHT,
        width: VIDEO_WIDTH,
        playerVars: {
          "controls": 0,
          "iv_load_policy": 3,
          "rel": 0,
          "showinfo": 0
        },
        events: {
          "onError": onPlayerError(reject),
          "onReady": onPlayerReady,
        }
      });
      resolve();
    };
  };
  this.pauseVideo = function() {
    player.pauseVideo();
  };
  this.playVideo = function() {
    player.playVideo();
  };
  this.seekTo = function(time) {
    player.seekTo(time);
  };
  this.loadVideoById = function(video_id) {
    return new Promise((resolve, reject) => {
      player.addEventListener("onStateChange", onPlayerStateChange(resolve, reject));
      player.addEventListener("onPlayerError", onPlayerError(reject));
      player.loadVideoById(video_id);
    });
  };
  
  var startPlayingVideoAfterBuffer = function(cb) {
    // add how much time was spent buffering
    var buffer_time = Date.now() - buffer_start_time_ms;
    cb(buffer_time);
  };

  var startBuffering = function() {
    // log the time when buffering started
    buffer_start_time_ms = Date.now();
  };

  // I want this to be a function that signals the transistioner that we are good 2 go
  var startPlayingVideo = function(cb) {
    // just started playing from the beginning
    self.start_time = Date.now();
    player.setVolume(VIDEO_VOLUME);
    self.video_duration_ms = self.video_duration_sec * 1000;
    cb(self.video_duration_sec);
  };
  
  var onPlayerReady = (e) => {
    return;
  };

  var onPlayerError = (reject) => (e) => {
    player.stopVideo();
    reject("msg-bad-url");
  };
  var  onPlayerStateChange = (resolve, reject) => function(event) {
    var status = event.data;
    if (status === YT.PlayerState.PLAYING) {
      if (status === YT.PlayerState.PLAYING) {
        self.video_duration_sec = player.getDuration();
        if (self.video_duration_sec > 0) {
          if (self.video_duration_sec > VIDEO_LENGTH_THRESHOLD) {
            if (self.start_time > 0) {
              startPlayingVideoAfterBuffer(detectorUpdateCB);
            } else {
              startPlayingVideo(graphUpdateCB);
            }
          } else { // video loads and starts playing but is too short
            showMessage("msg-short-video");
            player.stopVideo();
  
          }
        }
      } else if (status === YT.PlayerState.BUFFERING && self.video_duration_sec > VIDEO_LENGTH_THRESHOLD) {
        startBuffering();
      }
    } else if (status === YT.PlayerState.ENDED) {
      videoEnded();
    } else if (status === YT.PlayerState.CUED && self.video_duration_sec > VIDEO_LENGTH_THRESHOLD && self.playing) { // loss of Internet while playing video
      videoDisconnected();
    }
    // make cursor less buggy while video is paused
    if (status === YT.PlayerState.PLAYING) {
      self.playing = true;
    } else {
      self.playing = false;
    }
  };
}
*/