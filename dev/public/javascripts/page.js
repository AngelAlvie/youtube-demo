function Page() {
  var self = this;
  var player = null;
  // This should really be elsewhere in the code
  var API_KEY = "AIzaSyBw81iUUXQpYRuxSVmMc2jNkjv1tJwqHjc";

  // public members
  this.ready_to_accept_input = true;

  /** This is a function that creates an alert that is displayed to the user.
   * @param {string} id - Id of the html object that we cast the alert to
   * @param {string} text - text of the alert that we show to the user.
   */
  this.create_alert = function(id, text) {
    $("#lightbox").fadeIn(500);
    $("<div></div>", {
      id: id,
      class: "alert alert-danger",
      display: "none",
      text: text,
    }).appendTo("#lightbox");
    $("#" + id).css({"text-align": "center", "z-index": 2});
    $("#" + id).fadeIn(1000);

    return self;
  };

  /** Show a demo-message with the proper id
   * 
   * @param {string} id - id of element to show on screen.
   */
  this.show_message = function(id) {
    $(".demo-message").hide();
    $(document.getElementById(id)).fadeIn("fast");

    return self;
  };
  /** Remove a node from the view. 
   * @param {string} id - id of element to remove from the view.
   */
  this.fade_and_remove = function(id) {
    $(id).fadeOut(500, function() {
      this.remove();
    });
    $("#lightbox").fadeOut(1000);

    return self;
  };
  /** Create an alert that tells the user that there is no internet connection.
   */
  this.no_internet = function() {
    $(".alert").hide();
    this.create_alert("terminated", "It appears that you aren't connected to the Internet anymore. Please refresh the page and try again.");

    return self;
  };

  /** Handles Initializing all the page elements.
   */
  this.init = function() {
    $("#btn-start").click(startButtonClicked);
    // add click functionality to enter button
    $("#start-form").keyup(function (event) {
      if (event.keyCode === 13 || event.which === 13) {
        $("#btn-start").click();
      }
    });
    // "show all" button
    $("#all").css("border", "3px solid #ffcc66");

    loadYTPlayer();

    return self;
  };

  var loadYTPlayer = function() {
    // load IFrame Player API code asynchronously
    new Promise(function (resolve, _) {
      var tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      resolve();
    }).catch(() => {
      self.create_alert("Failed to load the YouTube Player");
    });
  };

  var httpGetAsync = function (url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
        callback(xmlHttp.responseText);
      }
    };
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
  };

  /** Renders an initial box of videos that we want to show the user
   * @param {string[]]} video_ids - list of ids for each of the videos we want to get. 
   */
  this.populate_examples = function (video_ids) {
    video_ids.forEach(function (value, index) {
      var id = "#example-" + index;
      var thumbnail_url = "https://i.ytimg.com/vi/" + video_ids[index] + "/mqdefault.jpg";
      $(id)[0].style.backgroundImage = "url(" + thumbnail_url + ")";
      $(id).click({ id: video_ids[index] }, videoButtonClicked);

      var url = "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + value + "&key=" + API_KEY;
      httpGetAsync(url, function (text) {
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

    return self;
  };

  var startButtonClicked = function (_) {
    $(".demo-message").hide();
    var video_id;

    if (self.ready_to_accept_input) {
      self.ready_to_accept_input = false;
      
      var blob = document.getElementById("start-form").value;
      
      if (blob === "" || blob.includes("http://") || blob.includes("https://")) { // treat as URL
        video_id = blob.split("v=")[1] || "";
        var ampersandPosition = video_id.indexOf("&");
        if (ampersandPosition !== -1) {
          video_id = video_id.substring(0, ampersandPosition);
        }
      } else { // treat as search
        var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&key=" + API_KEY + "&maxResults=10&safeSearch=strict&q=" + blob;
        httpGetAsync(url, self.add_to_search_results);
      }
    }
  };

  /** Takes a string of JSON, and adds the results to the view. TODO: Change this so that the videos don't get distorted with size, also don't add the missing videos
   * @param {string} text - String that represents JSON data
   */
  this.add_to_search_results = function(text) {
    $("#search-results").empty();
    var results = JSON.parse(text);
    var list = results.items;

    // add results
    for (var i = 0; i < list.length; i++) {
      var v = list[i];
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
      $("#"+id).click({id: id}, videoButtonClicked);  // These are buttons that are being used in start button click. i don't know why there is one big function
    }

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

    this.ready_to_accept_input = true;
  };

  this.referencePlayer = function(playerRef) {
    player = playerRef;
    return self;
  };

  var videoButtonClicked = function(event) {
    $(".demo-message").hide();
    if (self.ready_to_accept_input) {
      self.ready_to_accept_input = false;
      var video_id = event.data.id;
      if (typeof video_id !== "undefined") {
        player.loadVideoById(video_id, 0);
      }
    }
  };

}