$(document).ready(function () {
  var isChrome = !!window.chrome && !!window.chrome.webstore;
  var isFirefox = typeof InstallTrigger !== 'undefined';
  var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

  if (isChrome || isFirefox || isOpera) {
    JSSDKDemo.init();
    JSSDKDemo.run();
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
  var stop_capture_timeout = null;
  var time_left_sec = 0;
  var buffer_start_time_ms = 0;

  var page = new Page($, d3);
  var graph = new Graph("#svg-curve");
  var detector = new Detector(graph, page);

  var API_KEY = "AIzaSyBw81iUUXQpYRuxSVmMc2jNkjv1tJwqHjc";

  var start_button_click = function (event) {
    $(".demo-message").hide();

    if (page.ready_to_accept_input) {
      page.ready_to_accept_input = false;
      var ;

      if (event.data == null) {
        var blob = document.getElementById("start-form").value;

        if (blob === "" || blob.includes("http://") || blob.includes("https://")) { // treat as URL
          video_id = blob.split("v=")[1] || "";
          var ampersandPosition = video_id.indexOf("&");
          if (ampersandPosition !== -1) {
            video_id = video_id.substring(0, ampersandPosition);
          } video_id
        } else { // treat as search
          var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&key=" + API_KEY + "&maxResults=10&safeSearch=strict&q=" + blob;
          http_get_async(url, page.add_to_search_results);
        }

      } else { // play the video that was clicked
        video_id = event.data.id;
      }

      if (typeof video_id !== "undefined") {
        player.loadVideoById(video_id, 0);
      }
    }
  };

  var begin_capture = function () {
    // take care of gap at beginning
    graph.setXScale(start_time, video_duration_ms);
    graph.update_plot({
      "joy": 0,
      "anger": 0,
      "disgust": 0,
      "contempt": 0,
      "surprise": 0
    }, start_time);

    detector.setCaptureState(true);

    $("#demo-setup").fadeOut("fast", function () {
      $("#video-container").show();
      graph.init_plot();
      stop_capture_timeout = setTimeout(stop_capture, video_duration_ms);
    });
  };

  var stop_capture = function () {
    detector.setCaptureState(false);
    detector.stop();
    $(".alert").hide();

    // focus on message
    $("#lightbox").fadeIn(750, function () {
      // render cursor
      graph.add_cursor(player, video_duration_sec);
      graph.track_video(player, video_duration_sec);

      // make emotion buttons and player clickable
      //$("#ul-wrapper").css("pointer-events", "");
      $("#player").css("pointer-events", "");

      $("#play-again").fadeIn(500, function () {
        $("#lightbox").one("click", transition_to_playback);
      });
    });
  };

  var transition_to_playback = function () {
    $("#lightbox").fadeOut(500);
    $("#btn-play-again").fadeOut(500, function () {
      $(this).replaceWith(function () {
        return $("<button id='btn-play-again' class='btn btn-primary'>Try again</button>").fadeIn(500, function () {
          document.onkeypress = function (event) {
            if ((event || window.event).charCode == 32) {
              if (playing) {
                player.pauseVideo();
              } else {
                player.playVideo();
              }
            }
          };

          $("#btn-play-again").one("click", function () {
            window.location.reload(false);
          });
        });
      });
    });
  };

  var http_get_async = function (url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
        callback(xmlHttp.responseText);
      }
    };
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
  };

  var video_ids = ["EglYdO0k5nQ", "z63KGZE4rnM", "IV_ef2mm4G0", "dlNO2trC-mk", "lhzwmYRXPp4", "0kfLd52jF3Y"];

  var populate_examples = function () {
    video_ids.forEach(function (element, index) {
      var id = "#example-" + index;
      var thumbnail_url = "https://i.ytimg.com/vi/" + video_ids[index] + "/mqdefault.jpg";
      $(id)[0].style.backgroundImage = "url(" + thumbnail_url + ")";
      $(id).click({ id: video_ids[index] }, start_button_click);

      var url = "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + element + "&key=" + API_KEY;
      http_get_async(url, function (text) {
        var results = JSON.parse(text);
        if (results.items.length > 0) {
          var title = results.items[0].snippet.title;
          $(id).hover(function () {
            this.style.backgroundBlendMode = "overlay";
            $(this)[0].innerText = title;
          }, function () {
            this.style.backgroundBlendMode = "initial";
            $(this)[0].innerText = "";
          });
        }
      });
    });
  };

  return {
    init: function () {
      $("#btn-start").click(start_button_click);
      $("#btn-play-again").one("click", transition_to_playback);

      // add click functionality to enter button
      $("#start-form").keyup(function (event) {
        if (event.keyCode === 13 || event.which === 13) {
          $("#btn-start").click();
        }
      });

      // "show all" button
      $("#all").css("border", "3px solid #ffcc66");

      $("#all").click(graph.allClickHandler);

      // populate sample videos
      populate_examples();

      // load IFrame Player API code asynchronously
      setTimeout(function () {
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }, 1000);

      // initialize player
      window.onYouTubeIframeAPIReady = function () {
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

            }
            else if (status === YT.PlayerState.BUFFERING && video_duration_sec > VIDEO_LENGTH_THRESHOLD) { // video is valid but needs to buffer    
              detector.setCaptureState(false);
              clearTimeout(stop_capture_timeout);
              time_left_sec = video_duration_sec - player.getCurrentTime();

              // log the time when buffering started
              buffer_start_time_ms = Date.now();
            }
          }

          if (status === YT.PlayerState.ENDED) {
            if (!finished_watching) {
              finished_watching = true;
            } else {
              graph.translate_cursor(0, video_duration_sec);
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
            graph.setPlayingState(true);
          } else {
            playing = false;
            graph.setPlayingState(false);
          }
        }
      };
    },

    responses: graph.responses,
    run: detector.initializeAndStart,
    create_alert: page.create_alert
  };
})();