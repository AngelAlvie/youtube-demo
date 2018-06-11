/** Detector - This module Interfaces with the JSSDK, and configures the callbacks to perform the correct behavior
 * 
 */

function Detector(graphObj, pageObj) {
  var graph = graphObj;
  var page = pageObj;
  var detector = null;
  var capture_frames = false;
  var frames_since_last_face = 0;
  var face_visible = true;
  var time_buffering_ms = 0;

  var get_current_time_adjusted = function() {
    return Date.now() - time_buffering_ms;
  };
  
  this.initializeAndStart = function() {
    var facevideo_node = document.getElementById("facevideo-node");
    detector = new affdex.CameraDetector(facevideo_node);
    detector.detectAllEmotions();
    
    detector.addEventListener("onWebcamConnectSuccess", function() {
        page.show_message("msg-starting-webcam");
    });
    detector.addEventListener("onWebcamConnectFailure", function() {
        page.show_message("msg-webcam-failure");
    });

    if (detector && !detector.isRunning) {
        detector.start();
    }

    // get the video element inside the div with id "facevideo-node"
    var face_video = $("#facevideo-node video")[0];
    face_video.addEventListener("playing", function() {
        page.show_message("msg-detector-status");
    });

    detector.addEventListener("onInitializeSuccess", function() {
        page.show_message("instructions");
    });

    detector.addEventListener("onImageResultsSuccess", function(faces, _, _) {
        // get the time as close to the actual time of the frame as possible
        //  account for time spent buffering
        var fake_timestamp = get_current_time_adjusted();

        if (capture_frames) {
            if (frames_since_last_face > 100 && face_visible) {
                face_visible = false;
                page.create_alert("no-face", "No face was detected. Please re-position your face and/or webcam.");
            }

            if (faces.length > 0) {
                if (!face_visible) {
                    face_visible = true;
                    page.fade_and_remove("#no-face");
                }
                frames_since_last_face = 0;
                graph.update_plot(faces[0].emotions, fake_timestamp);
            } else {
                frames_since_last_face++;
            }
        }
    });
  };
  
  this.add_buffering_time = function(ms) {
    time_buffering_ms += ms;
  };

  this.setCaptureState = function(state) {
    capture_frames = state;
  };
  this.stop = function() {
    detector.stop();
  }
}