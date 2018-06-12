$(document).ready(function () {
  var isChrome = !!window.chrome && !!window.chrome.webstore;
  var isFirefox = typeof InstallTrigger !== 'undefined';
  var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

  if (isChrome || isFirefox || isOpera) {
    JSSDKDemo.start();
  } else {
    JSSDKDemo.create_alert("incompatible-browser", "It appears that you are using an unsupported browser. Please try this demo on Chrome, Firefox, or Opera.");
  }
});

var JSSDKDemo = (function () {
  var finished_watching = false;

  var player = null;
  var VIDEO_HEIGHT = 510;
  var VIDEO_WIDTH = 853;
  var VIDEO_VOLUME = 50;
  var VIDEO_LENGTH_THRESHOLD = 5;
  var video_duration_sec = 0;
  var video_duration_ms = 0;
  var start_time = 0;
  var playing = false;
  var playing_swap = false; // Used to prevent the video from losing its state when dragging occurs

  var stop_capture_timeout = null;
  var time_left_sec = 0;
  var buffer_start_time_ms = 0;
  var cursor_interval = null;

  var page = new Page();
  var graph = new Graph("#svg-curve");
  var detector = new Detector(graph, page);

  var video_ids = ["EglYdO0k5nQ", "z63KGZE4rnM", "IV_ef2mm4G0", "dlNO2trC-mk", "lhzwmYRXPp4", "0kfLd52jF3Y"];

  var begin_capture = function () {
    // take care of gap at beginning
    graph.setXScale(start_time, video_duration_ms);
    graph.updatePlot({
      "joy": 0,
      "anger": 0,
      "disgust": 0,
      "contempt": 0,
      "surprise": 0
    }, start_time);

    detector.setCaptureState(true);

    $("#demo-setup").fadeOut("fast", function () {
      $("#video-container").show();
      graph.initPlot();
      stop_capture_timeout = setTimeout(stop_capture, video_duration_ms);
    });
  };

  var stop_capture = function () {
    detector.setCaptureState(false);
    detector.stop();
    $(".alert").hide();

    // focus on message
    $("#lightbox").fadeIn(750, function () {
      // start playback
      initializePlayback();

      $("#player").css("pointer-events", "");

      $("#play-again").fadeIn(500, function () {
        $("#lightbox").one("click", transition_to_playback);
      });
    });
  };

  var dragHandler = function() {
    var x_coord = graph.clipX(d3.event.x);
    var playback_time = graph.playbackFromX(x_coord);
    graph.translateCursor(x_coord);
    player.seekTo(playback_time);
  };

  var dragStartHandler = function() {
    if (playing) {
      clearInterval(cursor_interval);
      // I want to stop the player until we stop dragging, but keep the state of the player as we drag.
      playing_swap = true;
      player.pauseVideo();
    }
    graph.setMousePointerDragging();
  };

  var dragEndHandler = function() {
    if (playing_swap) {
      player.playVideo(); 
      playing_swap = false; //reset it to false after use

      playing = true;
      track_video();
    }
    graph.setMousePointerUndragging();
  };

  var graphClickHandler = function() {
    var x_click = graph.clipX(d3.mouse(this)[0]);  //TODO: WHY IS THIS DIFFERENT FROM D3.EVENT?
    var playback_time = graph.playbackFromX(x_click);

    if (playing) {
      clearInterval(cursor_interval);
    }
    graph.translateCursor(x_click);
    player.seekTo(playback_time);

    if (playing) {
      track_video();
    }
  };

  var track_video = function() {
    cursor_interval = setInterval(function() {
      if (playing) {
        var x_coord = graph.playbackToX(player.getCurrentTime());
        graph.translateCursor(x_coord);
      }
    }, 50);
  };

  var duringVideoHandler = function() {
    if (status === YT.PlayerState.PLAYING) {
      video_duration_sec = player.getDuration();
      if (video_duration_sec > 0) {
        if (video_duration_sec > VIDEO_LENGTH_THRESHOLD) {
          if (start_time > 0) { // started playing again after buffering
            detector.setCaptureState(true);
            stop_capture_timeout = setTimeout(stop_capture, time_left_sec * 1000);

            // add how much time was spent buffering
            var buffer_time = Date.now() - buffer_start_time_ms;
            detector.add_buffering_time(buffer_time);

          } else { // just started playing from the beginning
            start_time = Date.now();
            player.setVolume(VIDEO_VOLUME);
            video_duration_ms = video_duration_sec * 1000;
            graph.configureForPlayback(video_duration_sec);
            begin_capture();
          }
        }
        else { // video loads and starts playing but is too short
          page.show_message("msg-short-video");
          player.stopVideo();
          page.ready_to_accept_input = true;
        }
      }
    } else if (status === YT.PlayerState.BUFFERING && video_duration_sec > VIDEO_LENGTH_THRESHOLD) { // video is valid but needs to buffer    
      detector.setCaptureState(false);
      clearTimeout(stop_capture_timeout);
      time_left_sec = video_duration_sec - player.getCurrentTime();

      // log the time when buffering started
      buffer_start_time_ms = Date.now();
    }
  };

  var initializePlayback = function() {
    var cursor = graph.initializeCursor();
    track_video();
    // Set Drag Handlers
    cursor
    .call(d3.drag()
      .on("drag", dragHandler)
      .on("start",dragStartHandler)
      .on("end",  dragEndHandler)
    );
    // Handle clicks to a particular moment in time
    graph
    .getCurveBox()
    .on("click", graphClickHandler);
  };

  var initializeYouTubePlayer = function () {
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
        "onError": onPlayerError,
        "onReady": onPlayerReady,
        "onStateChange": onPlayerStateChange
      }
    });
    function onPlayerReady(e) {
      return;
    }
    function onPlayerError(event) {
        page.show_message("msg-bad-url");
        player.stopVideo();
        page.ready_to_accept_input = true;
    }
    function onPlayerStateChange(event) {
      var status = event.data;
      if (!finished_watching) {
        duringVideoHandler();
      }
      if (status === YT.PlayerState.ENDED) {
        if (!finished_watching) {
          finished_watching = true;
        } else {
          graph.translateCursor(0, video_duration_sec);
        }
        player.seekTo(0);
        player.pauseVideo();
      } else if (status === YT.PlayerState.CUED && video_duration_sec > VIDEO_LENGTH_THRESHOLD && !finished_watching) { // loss of Internet while playing video
        finished_watching = true;
        player.stopVideo();
        clearTimeout(stop_capture_timeout);
        detector.stop();
        page.no_internet();
      }
      // make cursor less buggy while video is paused
      if (status === YT.PlayerState.PLAYING) {
        playing = true;
      } else {
        playing = false;
      }
      
    }
  };

  // Once you call this function, the demo should start up in one go.
  this.start = function () {
    page
    .init()
    .populate_examples(video_ids);

    // Register click handlers for each emotion button
    $("#all").click(graph.allButtonClickHandler);

    graph.emotions.forEach((val, idx) => {
      $("#"+val).click(graph.EmotionButtonClickHandler(val));
    });

    window.onYouTubeIframeAPIReady = initializeYouTubePlayer;

    detector.initializeAndStart();
  };

  this.create_alert = page.create_alert;
})();