/** Detector - This Class Interfaces with the Affectiva JSSDK.
 */

function Detector() {
  var self = this;
  var detector = null;
  var time_buffering_ms = 0;

  this.getCurrentTimeAdjusted = function() {
    return Date.now() - time_buffering_ms;
  };

  this.addEventListener = function(event, cb) {
    detector.addEventListener(event, cb);
    return self;
  };

  this.start = function() {
    var facevideo_node = document.getElementById("facevideo-node");
    detector = new affdex.CameraDetector(facevideo_node);
    detector.detectAllEmotions();

    if (detector && !detector.isRunning) {
      detector.start();
    }
    
    return self;
  };
  
  this.addBufferingTime = function(ms) {
    time_buffering_ms += ms;
    return self;
  };

  this.stop = function() {
    detector.stop();
    return self;
  };
}