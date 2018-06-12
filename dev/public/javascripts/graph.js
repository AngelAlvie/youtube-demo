/** Graph Controller
 *  This is an Object that performs the state changes and interfaces with the relevant libraries in order to graph data that is coming to the graph from the detector.
 * @param {string} id - id of the svg curve div object in the DOM 
 * @returns {object} - object that represents the graph controller.
 */
function Graph (id){
  // preserve the internal reference to this object, and get around javascript's wonky `this` behavior 
  var self = this;

  var curveBox = d3.select(id);
  var cursor = null;
  var cursor_text = null;

  var emotions = ["joy", "anger", "disgust", "contempt", "surprise"];
  var colors = ["#FFFFFF", "orangered", "deeppink", "yellow", "green"];
  var selected_emotion_border_properties = "3px solid #ffcc66";
  var selected_emotion = "all";
  var svg_width = 720;
  var x_scale = d3.scaleLinear().domain([0, 0]).range([0, svg_width]);
  var y_scale = d3.scaleLinear().domain([100, 0]).range([2, 248]);
  var time_scale = null;
  var cursor_interval = null;
  var processed_frames = [ [], [], [], [], [] ];
  var video_cutoff_sec = 0;
  var playing = false;
  var path = d3.line()
               .curve(d3.curveBasis)
               .x(function(d, i) {return x_scale(d[0])})
               .y(function(d, i) {return y_scale(d[1])});
  /** Creates a string that represents the current time of the video.
   * @param {float} time_sec - time in seconds
   * @returns {string} - string formated in correct time.
   */
  var text_time = function(time_sec) {
    return Math.floor(time_sec / 60) + ":" + ((time_sec % 60 < 10) ? ("0" + time_sec % 60) : time_sec % 60);
  };

  /** Sets the X Scale of the graph.
   * @param {*} start_time - time at which the video starts
   * @param {*} video_duration_ms - time at which the 
   */
  this.setXScale = function(start_time, video_duration_ms) {
    x_scale = d3.scaleLinear().domain([start_time, start_time + video_duration_ms]).range([0, svg_width]);

    return self;
  };

  /** Sets the internal representation for the state of the player - TODO: DELETE PLAYER REPRESENTATION, THAT SHOULD BE TRACKED BY THE PLAYER
   * 
   * @param {boolean} state  - state of the player
   */
  this.setPlayingState = function(state) {
    playing = state;

    return self;
  };

  /** Getter function for the d3 curve element
   *  @returns {object} - div that contains the curve
   */
  this.getCurveBox = function() {
    return curveBox;
  };
  /** Getter function for the various curves contained in the curve box
   * @returns {object} - returns a d3 selection
   */
  this.getCurves = function() {
    return curveBox.selectAll("path.curve");
  };
  /** This function takes an emotion, and transitions the currently selected emotion accordingly.
   * 
   * @param {string} emotion - name that is associated with the particular emotion that we are interested in.
   */
  this.resetSelectedEmotionButton = function(emotion) {
    // If the selected_emotion is not the one I just clicked, then toggle my current one, set me to all, and in
    if (selected_emotion !== emotion) {
      $("#" + selected_emotion).css("border", "");
      $("#" + emotion).css("border", selected_emotion_border_properties);
      selected_emotion = emotion;
    }

    return self;
  };

  /** Button Handler for the `all` button.
   */
  this.allButtonClickHandler = function() {
    self
    .resetSelectedEmotionButton("all")
    .getCurves()
    .transition()
    .duration(400)
    .attr("stroke-opacity", 1.0);
  };
  /** Button Handler Generator for the rest of the emotions
   *  Just call `$(button).click(graph.EmotionButtonClickHandler(emotion));` to use
   * @param {string} emotion - name of the emotion that we want to highlight.
   */
  this.EmotionButtonClickHandler = function(emotion) {
    return function() {
      self
      .resetSelectedEmotionButton(emotion)
      .getCurves()
      .transition()
      .duration(400)
      .attr("stroke-opacity", function(d,i) {
        if (this.id === emotion) {
          return 1.0;
        } else {
          return 0.2;
        }
      });
    }
  };

  /** Adds a singular datum to the graph.
   * @param {string -> float} emotionTable - this is a dictionary that maps each emotion to a floating point number
   * @param {float} timestamp - this is the timestamp in the video where we plot the data (effectively the x coordinate)
   */
  this.addDataPoint = function(emotionTable, timestamp) {
    emotions.forEach(function(val, idx) {
      processed_frames[idx].push([timestamp, emotionTable[val]]);
    });

    return self;
  };


  /** updates the plot to have up to date information
   * @param {string -> float} emotionTable - this is a dictionary that maps each emotion to a floating point number
   * @param {float} timestamp - this is the timestamp in the video where we plot the data (effectively the x coordinate)
   */
  this.update_plot = function(emotionTable, timestamp) {
    self
    .addDataPoint(emotionTable, timestamp)
    .getCurves()
    .data(processed_frames)   // curves are assigned in index order, this is how d3 works.
    .attr("d", path);

    return self;
  };
  
  /** Instantiate the plot. zero the data, and set attributes of curves.
   */
  this.init_plot = function() {

    var initial_data = [
      [ [0, 0] ], // joy
      [ [0, 0] ], // anger
      [ [0, 0] ], // disgust
      [ [0, 0] ], // contempt
      [ [0, 0] ]  // surprise
    ];

    self
    .getCurves()
    .data(initial_data)
    .enter()
    .append("svg:path")
    .attr("class", "curve")
    .attr("id", function(d, i){return emotions[i]})
    .attr("d", path)
    .attr("stroke", function(d, i) { return colors[i] } )
    .attr("fill", "transparent")
    .attr("stroke-width","2px")
    .attr("stroke-opacity", "1");

    return self;
  };

  /** Move the cursor (line) to the relevant x coordinate and render the time location of the cursor
   * @param {number} x_coord - the x_coord to set the cursor to
   * @param {float} video_duration_sec - the length of the video in seconds
   */
  this.translate_cursor = function(x_coord, video_duration_sec) {
    // translate timeline cursor
    cursor.attr("transform", "translate(" + x_coord + ", 0)");

    // render time
    var time_sec = Math.floor(x_coord / svg_width * video_duration_sec);
    var text = text_time(time_sec);
    cursor_text.text(text);

    // figure out if flip is necessary
    $("#text-width")[0].innerHTML = text;
    var text_width = $("#text-width")[0].clientWidth;
    var flip_at = svg_width - text_width - 5;

    if (x_coord > flip_at) {
      cursor_text.attr("transform", "translate(" + (x_coord - text_width - 10) + ", 0)");
    } else {
      cursor_text.attr("transform", "translate(" + x_coord + ", 0)");
    }

    return self;
  };


  // TODO: RELOCATE THIS FUNCTION
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

  /** Handler function that sets the cursor to wherever the mouse is dragging it to.
   *  @param {object} player - reference to the player object, so that we can seek to it
   */
  this.dragHandler = function(player, video_duration_sec) {
    return function() {
      console.log("dragging");
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
    }
  };

  this.dragStartHandler = function(player) {
    return function() {
      if (playing) {
        clearInterval(cursor_interval);
        // I want to stop the player until we stop dragging TODO: Implement pause and play properly when dragging the cursor
        //player.pauseVideo();
      }
      $("html, .draggable-rect, line.cursor-wide").css({"cursor": "-webkit-grabbing"});
      $("html, .draggable-rect, line.cursor-wide").css({"cursor": "-moz-grabbing"});
      $("html, .draggable-rect, line.cursor-wide").css({"cursor": "grabbing"});
    };
  };

  this.dragEndHandler = function(player, video_duration_sec) {
    return function() {
      if (playing) {
        self.track_video(player, video_duration_sec);
        //player.playVideo();
      }
      $("html").css({"cursor": "default"});
      $(".draggable-rect, line.cursor-wide").css("cursor", "pointer");
    };
  };

  this.graphClickHandler = function(player, video_duration_sec) {
    return function() {

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
    }
  };


  /** Performs the necesary state changes to make sure that the graph is ready for playback.
   * @param {object} player - reference to the player object
   */
  this.add_cursor = function(player, video_duration_sec) {
    // Since we are dealing with callbacks, lets drop a local reference to our object here
    
    // Initialize Cursor
    cursor = curveBox.append("svg:g").attr("y1", 0).attr("y2", 250).attr("x1", 0).attr("x2", 10).attr("class", "draggable-group");
    cursor.append("svg:rect").attr("x", -5).attr("y", 0).attr("width", 10).attr("height", 250).attr("class", "draggable-rect");
    cursor.append("svg:line").attr("class", "cursor cursor-wide").attr("y1", 0).attr("y2", 250).attr("x1", 0).attr("x2", 0);

    // Set Drag Handlers
    cursor
    .call(d3.drag()
      .on("drag", self.dragHandler(player, video_duration_sec))
      .on("start",self.dragStartHandler(player))
      .on("end",  self.dragEndHandler(player, video_duration_sec))
    );

    // Initialize cursor text box for current time
    cursor_text = curveBox.append("svg:text").attr("class", "time video_current_time").attr("y", 20).attr("x", 5).text("0:00");

    // Handle clicks to a particular moment in time
    curveBox.on("click", self.graphClickHandler(player, video_duration_sec));
  };

  /** Should be called from onPlayerStateChange in the player callback closure. This sets the necesary variables to enable the timestep and scale
   * @param {float} video_duration_sec - the duration of the video in seconds. Used to create a linear time scale.
   */
  this.configureForPlayback = function(video_duration_sec) {
    video_cutoff_sec = Math.floor(video_duration_sec);
    time_scale = d3.scaleLinear().domain([0, video_duration_sec]).range([0, svg_width]);
  };
}