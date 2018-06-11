/** Graph Controller
 *  This is an Object that performs the state changes and interfaces with the relevant libraries in order to graph data that is coming to the graph from the detector.
 * @param {string} id - id of the svg curve div object in the DOM 
 * @returns {object} - object that represents the graph controller.
 */
function Graph (id){ 
  var self = this;
  var curve = d3.select(id);
  var emotions = ["joy", "anger", "disgust", "contempt", "surprise"];
  var colors = ["#FFFFFF", "orangered", "deeppink", "yellow", "green"];
  var selected_emotion = "all";
  var svg_width = 720;
  var x_scale = d3.scale.linear().domain([0, 0]).range([0, svg_width]);
  var y_scale = d3.scale.linear().domain([100, 0]).range([2, 248]);
  var time_scale = null;
  var cursor_interval = null;
  var processed_frames = [ [], [], [], [], [] ];
  var video_cutoff_sec = 0;
  var playing = false;
  var path = d3.svg
               .line()
               .x(function(d, i) {return x_scale(d[0])})
               .y(function(d, i) {return y_scale(d[1])})
               .interpolate("basis");

  var text_time = function(time_sec) {
    return Math.floor(time_sec / 60) + ":" + ((time_sec % 60 < 10) ? ("0" + time_sec % 60) : time_sec % 60);
  };

  this.setXScale = function(start_time, video_duration_ms) {
    x_scale = d3.scale.linear().domain([start_time, start_time + video_duration_ms]).range([0, svg_width]);;
  };

  this.setPlayingState = function(state) {
    playing = state;
  };

  /** Button Handler for the `all` button.
   */
  this.allClickHandler = function() {
    // set border
    if (selected_emotion !== "all") {
      $("#" + selected_emotion).css("border", "");
      $(this).css("border", "3px solid #ffcc66");
    }
    selected_emotion = "all";
    
    curve.selectAll("path.curve")
    .transition()
    .duration(400)
    .attr("stroke-opacity", 1.0);
  };

  /** updates the plot to have up to date information
   * @param {string -> float} emotionTable - this is a dictionary that maps each emotion to a floating point number
   * @param {float} timestamp - this is the timestamp in the video where we plot the data (effectively the x coordinate)
   */
  this.update_plot = function(emotionTable, timestamp) {
    emotions.forEach(function(val, idx) {
      processed_frames[idx].push([timestamp, emotionTable[val]]);
    });
    curve
    .selectAll("path.curve")
    .data(processed_frames)
    .attr("d", path);
  };
  
  /** Instantiate the plot. zero the data, so that it can start somewhere, set attributes of curves.
   */
  this.init_plot = function() {

    var initial_data = [
      [ [0, 0] ], // joy
      [ [0, 0] ], // anger
      [ [0, 0] ], // disgust
      [ [0, 0] ], // contempt
      [ [0, 0] ]  // surprise
    ];

    curve
    .selectAll("path.curve")
    .data(initial_data)
    .enter()
    .append("svg:path")
    .attr("class", "curve")
    .attr("id", function(d, i){return emotions[i]})
    .attr("d", path).attr("stroke", function(d, i) { return colors[i] } )
    .attr("fill", "transparent")
    .attr("stroke-width","2px")
    .attr("stroke-opacity", "1");
  };

  /** Move the cursor (line) to the relevant x coordinate
   * @param {number} x_coord - the x_coord to set the cursor to
   * @param {float} video_duration_sec - the length of the video in seconds
   */
  this.translate_cursor = function(x_coord, video_duration_sec) {
    // translate timeline cursor
    d3.selectAll("#svg-curve .draggable-group").attr("transform", "translate(" + x_coord + ", 0)");

    // render time
    var time = d3.selectAll("#svg-curve text.video_current_time");
    var time_sec = Math.floor(x_coord / svg_width * video_duration_sec);
    var text = text_time(time_sec);
    time.text(text);

    // figure out if flip is necessary
    $("#text-width")[0].innerHTML = text;
    var text_width = $("#text-width")[0].clientWidth;
    var flip_at = svg_width - text_width - 5;

    if (x_coord > flip_at) {
      time.attr("transform", "translate(" + (x_coord - text_width - 10) + ", 0)");
    } else {
      time.attr("transform", "translate(" + x_coord + ", 0)");
    }
  };

  /** Creates a timeout of 50 ms that allows the playback scrubber to track the video.
   * @param {object} player - must pass a reference back to the player to get current time, and perform necesary state changes
   * @param {float} video_duration_sec - this is the duration of the video in seconds. 
   */
  this.track_video = function(player, video_duration_sec) {
    cursor_interval = setInterval(function() {
      if (playing) {
        var x_coord = time_scale(player.getCurrentTime());
        self.translate_cursor(x_coord, video_duration_sec);
      }
    }, 50);
  };

  /** Performs the necesary state changes to make sure that the graph is ready for playback.
   * @param {object} player - reference to the player object
   */
  this.add_cursor = function(player, video_duration_sec) {
    // Since we are dealing with callbacks, lets drop a local reference to our object here
    
    // draggable cursor
    var drag_group = curve.append("svg:g").attr("y1", 0).attr("y2", 250).attr("x1", 0).attr("x2", 10).attr("class", "draggable-group");
    drag_group.append("svg:rect").attr("x", -5).attr("y", 0).attr("width", 10).attr("height", 250).attr("class", "draggable-rect");
    drag_group.append("svg:line").attr("class", "cursor cursor-wide").attr("y1", 0).attr("y2", 250).attr("x1", 0).attr("x2", 0);
    drag_group.call(d3.behavior.drag().on("drag", function() {
      var x_coord = d3.event.x;
      var playback_time = time_scale.invert(x_coord);
      if (playback_time < 0) {
        x_coord = 0;
        playback_time = 0;
      } else if (playback_time >= video_cutoff_sec) {
        playback_time = video_cutoff_sec - 0.001;
        x_coord = time_scale(playback_time);
      }
      self.translate_cursor(x_coord, video_duration_sec);
      player.seekTo(playback_time);
    }).on("dragstart", function(event) {
      if (playing) {
        clearInterval(cursor_interval);
      }
      $("html, .draggable-rect, line.cursor-wide").css({"cursor": "-webkit-grabbing"});
      $("html, .draggable-rect, line.cursor-wide").css({"cursor": "-moz-grabbing"});
      $("html, .draggable-rect, line.cursor-wide").css({"cursor": "grabbing"});
    }).on("dragend", function() {
      if (playing) {
        self.track_video(player, video_duration_sec);
      }
      $("html").css({"cursor": "default"});
      $(".draggable-rect, line.cursor-wide").css("cursor", "pointer");
    }));

    curve.append("svg:text").attr("class", "time video_current_time").attr("y", 20).attr("x", 5).text("0:00");
    curve.on("click", function(){
      var x_click = d3.mouse(this)[0];
      var playback_time = time_scale.invert(x_click);

      if (playback_time >= video_cutoff_sec) {
        playback_time = video_cutoff_sec - 0.001;
        x_click = time_scale(playback_time);
      }

      if (playing) {
        clearInterval(cursor_interval);
      }
      self.translate_cursor(x_click, video_duration_sec);
      player.seekTo(playback_time);

      if (playing) {
        self.track_video(player, video_duration_sec);
      }
    });
  };

  /** This is needed for setting the buttons in the html
   * 
   * @param {number} clicked_id - id of the emotion that I care about.
   */
  this.responses = function(clicked_id) {
    // set border
    if (selected_emotion !== clicked_id) {
      $("#" + selected_emotion).css("border", "");
      $("#" + clicked_id).css("border", "3px solid #ffcc66");
    }
    selected_emotion = clicked_id;
    curve
    .selectAll("path.curve")
    .transition()
    .duration(400)
    .attr("stroke-opacity", function(d,i) {
      if (this.id === clicked_id) {
        return 1.0;
      } else {
        return 0.2;
      }
    });
  },

  /** Should be called from onPlayerStateChange in the player callback closure. This sets the necesary variables to enable the timestep and scale
   * @param {float} video_duration_sec - the duration of the video in seconds. Used to create a linear time scale.
   */
  this.configureForPlayback = function(video_duration_sec) {
    video_cutoff_sec = Math.floor(video_duration_sec);
    time_scale = d3.scale.linear().domain([0, video_duration_sec]).range([0, svg_width]);
  };
}