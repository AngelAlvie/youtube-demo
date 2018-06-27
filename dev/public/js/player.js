/** Asynchronous Player is a closure that is configurable with callbacks and signals.
 */
function AsyncPlayer() {
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

  const initializeYouTubePlayer = (cb) => () => {
    player = new YT.Player("player", {
      height: VIDEO_HEIGHT,
      width: VIDEO_WIDTH,
      playerVars: {
        "controls": 0,
        "iv_load_policy": 3,
        "rel": 0,
        "showinfo": 0
      }
    });
    cb("loaded");
  };

  const onPlayerError = (cb) => (e) => {
    player.stopVideo();
    cb("error", null);
  };

  const onPlayerStateChange = (cb) => (e) => {
    var status = e.data;
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
              cb("video start", {
                video_duration_ms:video_duration_ms,
                start_time: start_time,
                video_duration_sec:video_duration_sec
              }); // pass duration back to the callback
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
    } else if (status === YT.PlayerState.CUED && video_duration_sec > VIDEO_LENGTH_THRESHOLD && playing) { // loss of internet while playing video
      cb("network fail", null);
      player.stopVideo();
    }
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
      new Promise((resolve, reject) => {
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);  
        resolve();
      });
      // Defer the resolution of this promise to the initialize callback of the youtube player
      window.onYouTubeIframeAPIReady = initializeYouTubePlayer(cb); 
    } else if (message === "play") {
      player.addEventListener("onStateChange", onPlayerStateChange(cb));
      player.addEventListener("onError", onPlayerError(cb));
      player.loadVideoById(data); // assume that data is a video id
    } else if (message === "seek") {
      player.seekTo(data);        // assume that data is a time
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
    } else if (message === "setPlayingState") {
      playing = data;
    }
  };
}