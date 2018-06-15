/** Development log: What is there still left to do:
 * Adjust the curated videos so that it renders the same way as the video **search** results
 * Change the injected html so that the videos don't get distorted with size, also don't add the missing videos
 * Change Behavior of the reload function, so we transition back to the other screen, with out having to reload the detector
 * Figure out why the click handler event is a different syntax from the d3 event syntax (graphClickHandler)?
 * add an alert if you click an invalid video (the button doesn't have a valid ID)
 */

// Initialize Demo
let JSSDKDemo = null;

/** Check whether or not this demo is running on a browser that supports this demo
 */
const browserCheck = () => {
  let isChrome = !!window.chrome && !!window.chrome.webstore;
  let isFirefox = typeof InstallTrigger !== "undefined";
  let isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(" OPR/") >= 0;
  return (isChrome || isFirefox || isOpera);
};

$(document).ready(() => {
  JSSDKDemo = new Demo();
  if (browserCheck()) {
    JSSDKDemo.start();
  } else {
    JSSDKDemo.createAlert("incompatible-browser", "It appears that you are using an unsupported browser. Please try this demo on Chrome, Firefox, or Opera.");
  }
});

function Demo() {
  const self = this; // Use this inside of methods to ensure that we are using the correct object

  // These are the states that the demo can be in
  this.States = {
    LOADING:"LOADING",  // This State is for loading the Affdex Detector and should be indicated by the loading view.
    SEARCHING:"SEARCHING",
    RECORDING:"RECORDING",
    PLAYBACK:"PLAYBACK"
  };
  var state = self.States.LOADING; // We start the demo in the LOADING STATE.

  var initial_videos = []; // This array stores all of the videos that we want to load into the suggestions
  var playing_swap = false; // Used to prevent the video from losing its state when dragging occurs
  var cursor_interval = null;

  // This should really not be in the client, but oh well.
  var API_KEY = "AIzaSyBw81iUUXQpYRuxSVmMc2jNkjv1tJwqHjc";
  
  var player = new AsyncPlayer();
  var graph = new Graph("#svg-curve");
  var detector = new Detector(graph);
  var video_ids = ["EglYdO0k5nQ", "z63KGZE4rnM", "IV_ef2mm4G0", "dlNO2trC-mk", "lhzwmYRXPp4", "0kfLd52jF3Y"];  /* This is a 3 second clip to test the short url thing "JZYJDCbFKoc"*/

  /** ==============================================================
   *                      Pubilc Methods
   *  ============================================================== */

  // This method is to make the state of the Demo read only.
  this.state = () => state;

  // This method will start the Demo, it will begin loading all of the necesary functions.
  this.start = () => {
    return Promise
      .all([loadYTPlayer(),loadDetector(), loadExamples(video_ids)])
      .then(() => {
        transitionToSearching();
      })
      .catch((message) => {
        showMessage(message);
      });
  };

  /** ==============================================================
   *   Initialization - methods to run during the LOADING phase
   *  ============================================================== */

  /** Promise factory to load the YT Player and bind the relevant callbacks. */
  var loadYTPlayer = () => {
    // load IFrame Player API code asynchronously
    return new Promise(function (resolve, reject) {
      var tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // I want to defer the resolution of this promise to the initialize callback of the youtube player
      window.onYouTubeIframeAPIReady = player.initializeYouTubePlayer(showMessage, 
        graph.configureForPlayback, 
        detector.addBufferingTime, 
        videoEnded, 
        videoDisconnected)(resolve, reject); 
    });
  };

  var videoEnded = function() {
    // We check if we were in playback mode or not. If we were, then don't spam new cursors, else, we want to transition
    if (state === self.States.PLAYBACK) {
      graph.translateCursor(0, player.video_duration_sec);
    } else {
      transitionToPlayback();
    }
    player.seekTo(0);
    player.pauseVideo();
  };

  var videoDisconnected = function() {
    player.stopVideo();
    detector.stop();
    noInternet();
  };

  /** Promise factory to load the Detector and bid the relevant callbacks. */
  var loadDetector = () => {
    return new Promise((resolve, reject) => {
      detector
        .start()
        .addEventListener("onWebcamConnectSuccess", function() {
          showMessage("msg-starting-webcam");
        })
        .addEventListener("onWebcamConnectFailure", function() {
          reject("msg-webcam-failure");
        })
        .addEventListener("onInitializeSuccess", function() {
          resolve();
        })
        .addEventListener("onInitializeFailure", function() {
          reject("msg-affdex-failure");
        })
        .addEventListener("onImageResultsSuccess", function(faces, img, timestamp) {
          if (state === self.States.RECORDING) {
            // account for time spent buffering
            var fake_timestamp = detector.getCurrentTimeAdjusted();
            
            if (detector.frames_since_last_face > 100 && detector.face_visible) {
              detector.face_visible = false;
              self.createAlert("no-face", "No face was detected. Please re-position your face and/or webcam.");
            }
            if (faces.length > 0) {
              if (!detector.face_visible) {
                detector.face_visible = true;
                fadeAndRemove("#no-face");
              }
              detector.frames_since_last_face = 0;
              graph.updatePlot(faces[0].emotions, fake_timestamp);
            } else {
              detector.frames_since_last_face++;
            }
          }
        });
      var face_video = $("#facevideo-node video")[0];
      face_video.addEventListener("playing", function() {
        showMessage("msg-detector-status");
      });
    });
  };

  /** This makes a request to load example video data to the `initial_videos` array.
   * @param {string[]]} video_ids - list of ids for each of the videos we want to get. 
   */
  var loadExamples = (video_ids) => {
    let promises = [];
    video_ids.forEach(function (value, index) {
      var url = "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + value + "&key=" + API_KEY;
      promises.push(
        httpGetAsync(url)
          .then(addVideoToSuggested(value))
          .catch(ignore)
      );
    });

    return Promise.all(promises);
  };

  /** Function that takes a video ID, and returns a function that takes a XMLHttpResponse and adds it to our initial videos to load */
  var addVideoToSuggested = (value) => (results) => {
    if (results.items.length > 0) {
      var title = results.items[0].snippet.title;
      //each entry in the initial videos array will have a video_id and a title.
      initial_videos.push({
        title:title,
        id:value
      });
    }
  };

  /** ==============================================================
   *   Search - methods to run during the SEARCHING phase
   *  ============================================================== */

  /** This function transitions the page into the SEARCHING state.
   */
  var transitionToSearching = function() {
    // Assign relevant handlers to buttons
    $("#btn-start").click(startButtonClicked);
    // add click functionality to enter button
    $("#start-form").keyup(function (event) {
      if (event.keyCode === 13 || event.which === 13) {
        $("#btn-start").click();
      }
    });
    // Render the instructions
    showMessage("instructions");
    // Render the Youtube Videos
    populateExamples(video_ids);

    // Display (or not) the Facecam
    // $('#facevideo-node').hide();

    state = self.States.SEARCHING;
  }; 

  // Renders an initial box of videos that we want to show the user
  var populateExamples = function () {
    initial_videos.forEach(function (video, index) {
      var id = "#example-" + index;
      var thumbnail_url = "https://i.ytimg.com/vi/" + video.id + "/mqdefault.jpg";  // This gets the thumbnail

      $(id)[0].style.backgroundImage = "url(" + thumbnail_url + ")";
      // Give it the click handler
      $(id).click({ id: video.id }, onVideoClick);
      
      $(id).hover(function () {
        this.style.backgroundBlendMode = "overlay";
        $(this)[0].innerText = video.title;
      }, function () {
        this.style.backgroundBlendMode = "initial";
        $(this)[0].innerText = "";
      });

    });
  };

  // OnVideoClick will initialize the transition to the next state
  var onVideoClick = function(event) {
    if (state === self.States.SEARCHING) {
      
      var video_id = event.data.id;
      if (typeof video_id !== "undefined") {
        transitionToRecording(video_id);
      }
    }
  };

  var startButtonClicked = function (_) {
    $(".demo-message").hide();
    var video_id;
    if (state === self.States.SEARCHING) {
      
      var blob = document.getElementById("start-form").value;
      
      if (blob === "" || blob.includes("http://") || blob.includes("https://")) { // treat as URL
        video_id = blob.split("v=")[1] || "";
        var ampersandPosition = video_id.indexOf("&");
        if (ampersandPosition !== -1) {
          video_id = video_id.substring(0, ampersandPosition);
        }
      } else { // treat as search
        var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&key=" + API_KEY + "&maxResults=10&safeSearch=strict&q=" + blob;
        httpGetAsync(url)
          .then(addToSearchResults)
          .catch(ignore);
      }
    }
  };

  /** Takes a string of JSON, and adds the results to the view.  
   * @param {string} text - String that represents JSON data */
  var addToSearchResults = function(results) {
    $("#search-results").empty();
    var list = results.items;

    // add results
    list.forEach(function(val) {
      var v = val;
      var s = v.snippet;
      var id = v.id.videoId;
      var result = document.createElement("div");
      result.className = "list-group-item";
      result.innerHTML = 
      `<table>
        <tr>
          <td><img class="thumbnail" id="${id}" src="${s.thumbnails.medium.url}" style="margin-right:15px"></td>
          <td valign="top"><h3>${s.title}</h3><span>${s.description}</span></td>
        </tr>
      </table>`;    
      $("#search-results").append(result);
      $("#"+id).click({id: id}, onVideoClick);  // These are buttons that are being used in start button click. i don't know why there is one big function
    });

    // show a message for when no videos were found
    var num_videos = results.pageInfo.totalResults;
    if (num_videos === 0) {
      var message = document.createElement("div");
      message.className = "list-group-item";
      message.innerHTML = "<p>No results were found.</p>";
      $("#search-results").append(message);
    }

    // scroll to results
    $("html, body").animate({
      scrollTop: $("#search-results").offset().top - 15
    });
  };

  /** ==============================================================
   *   Record - methods to run during the RECORDING phase
   *  ============================================================== */
  
  /** This function transitions the page into the RECORDING state. 
   * @param {string} video_id - internal youtube id for the video that we want to transition to playing
  */
  var transitionToRecording = function(video_id) {
    // Remove any demo messages we recieved
    $(".demo-message").hide();


    // start the detector ("The detector only starts graphing when we are in the RECORDING phase")
    player
      .loadVideoById(video_id, 0)
      .then(() => {
        // initialize the graph
        loadGraphButtons();
        state = self.States.RECORDING;
        showGraph();
      })
      .catch(() => {

      });

  };

  /** Show the graph that was loaded earlier */
  var showGraph = function () {
    // take care of gap at beginning
    graph.setXScale(player.start_time, player.video_duration_ms);
    graph.updatePlot({
      "joy": 0,
      "anger": 0,
      "disgust": 0,
      "contempt": 0,
      "surprise": 0
    }, player.start_time);

    $("#demo-setup").fadeOut("fast", function () {
      $("#video-container").show();
      graph.initPlot();
    });
  };

  var loadGraphButtons = function() {
    // "show all" button
    $("#all").css("border", "3px solid #ffcc66");
    // Register click handlers for each emotion button
    $("#all").click(graph.allButtonClickHandler);

    graph.emotions.forEach((val) => {
      $("#"+val).click(graph.EmotionButtonClickHandler(val));
    });
  };

  /** ==============================================================
   *   Playback - methods to run during the PLAYBACK phase
   *  ============================================================== */

  var transitionToPlayback = function () {
    state = self.States.PLAYBACK;
    detector.stop();

    $(".alert").hide();

    // focus on message
    $("#lightbox").fadeIn(750, function () {
      // start playback
      initializePlayback();
      $("#player").css("pointer-events", "");
      $("#play-again").fadeIn(500, function () {
        $("#lightbox").one("click", allowPlayback);
      });
      $("#btn-play-again").one("click", allowPlayback);
    });
  };
  
  var initializePlayback = function() {
    var cursor = graph.initializeCursor();
    trackVideo();
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

  var allowPlayback = function () {
    $("#lightbox").fadeOut(500);
    $("#btn-play-again").fadeOut(500, function () {
      $(this).replaceWith(function () {
        return $("<button id='btn-play-again' class='btn btn-primary'>Try again</button>").fadeIn(500, function () {
          setSpaceBarPlayBehvaior();
          $("#btn-play-again").one("click", function () { 
            window.location.reload(false);
          });
        });
      });
    });
  };

  var setSpaceBarPlayBehvaior = function () {
    document.onkeypress = function (event) {
      if ((event || window.event).charCode == 32) {
        if (player.playing) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      }
    };
  };

  var dragHandler = function() {
    var x_coord = graph.clipX(d3.event.x);
    var playback_time = graph.playbackFromX(x_coord);
    graph.translateCursor(x_coord);
    player.seekTo(playback_time);
  };

  var dragStartHandler = function() {
    if (player.playing) {
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

      player.playing = true;
      trackVideo();
    }
    graph.setMousePointerUndragging();
  };

  var graphClickHandler = function() {
    var x_click = graph.clipX(d3.mouse(this)[0]);
    var playback_time = graph.playbackFromX(x_click);

    if (player.playing) {
      clearInterval(cursor_interval);
    }
    graph.translateCursor(x_click);
    player.seekTo(playback_time);

    if (player.playing) {
      trackVideo();
    }
  };

  var trackVideo = function() {
    cursor_interval = setInterval(function() {
      if (player.playing) {
        var x_coord = graph.playbackToX(player.getCurrentTime());
        graph.translateCursor(x_coord);
      }
    }, 50);
  };

  /** ==============================================================
   *                      UTILITIES AND ALERTS
   *  ============================================================== */

  /** Function that just ignores it's input and returns null. Useful for ignore promise failures */
  var ignore = () => {};
  
  /** Creates a promise that resolves a GET request when the server returns a response status of 200, fails otherwise.
   * @param {string} urlString - URL of the GET request.
   */  
  var httpGetAsync = function (urlString) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url:urlString,
        method:"GET",
        success:function( data, textStatus, jqXHR ) {resolve(data); },
        failure:function( jqXHR, textStatus, errorThrown) {reject(errorThrown); }
      });
    });
  };

  /** This is a function that creates an alert that is displayed to the user.
   * @param {string} id - Id of the html object that we cast the alert to
   * @param {string} text - text of the alert that we show to the user.
   */
  this.createAlert = function(id, text) {
    $("#lightbox").fadeIn(500);
    $("<div></div>", {
      id: id,
      class: "alert alert-danger",
      display: "none",
      text: text,
    }).appendTo("#lightbox");
    $("#" + id).css({"text-align": "center", "z-index": 2});
    $("#" + id).fadeIn(1000);
  };

  /** Show a demo-message with the proper id
   * @param {string} id - id of element to show on screen.
   */
  var showMessage = function(id) {
    $(".demo-message").hide();
    $(document.getElementById(id)).fadeIn("fast");
  };

  /** Remove alerts created by the `createAlert` function. 
   * @param {string} id - id of element to remove from the view.
   */
  var fadeAndRemove = function(id) {
    $(id).fadeOut(500, function() {
      this.remove();
    });
    $("#lightbox").fadeOut(1000);
  };

  /** Create an alert that tells the user that there is no internet connection.
   */
  var noInternet = function() {
    $(".alert").hide();
    self.createAlert("terminated", "It appears that you aren't connected to the Internet anymore. Please refresh the page and try again.");
  };
}