function Page() {
  var self = this;

  var API_KEY = "AIzaSyBw81iUUXQpYRuxSVmMc2jNkjv1tJwqHjc";

  this.ready_to_accept_input = true;

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
  };

  this.show_message = function(id) {
    $(".demo-message").hide();
    $(document.getElementById(id)).fadeIn("fast");
  };

  this.fade_and_remove = function(id) {
    $(id).fadeOut(500, function() {
      this.remove();
    });
    $("#lightbox").fadeOut(1000);
  };

  this.no_internet = function() {
    $(".alert").hide();
    page.create_alert("terminated", "It appears that you aren't connected to the Internet anymore. Please refresh the page and try again.");
  };

  /** Handles Initializing all the page elements.
   */
  this.init = function() {
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

    // load IFrame Player API code asynchronously
    new Promise(function (resolve, _) {
      var tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      resolve();
    })
    .catch(() => {
      page.create_alert("Failed to load the YouTube Player");
    });

    return self;
  };

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
        result.innerHTML = '<table><tr><td><img class="thumbnail" id="' + id + '" src="' + s.thumbnails.medium.url + '" style="margin-right:15px"></td><td valign="top"><h3>' + s.title + '</h3><span>' + s.description + '</span></td></tr></table>';
        $("#search-results").append(result);
        $("#"+id).click({id: id}, start_button_click);
    }

    // show a message for when no videos were found
    var num_videos = results.pageInfo.totalResults;
    if (num_videos === 0) {
        var message = document.createElement("div");
        message.className = "list-group-item";
        message.innerHTML = '<p>No results were found.</p>';
        $("#search-results").append(message);
    }

    // scroll to results
    $("html, body").animate({
        scrollTop: $("#search-results").offset().top - 15
    });

    ready_to_accept_input = true;
  };

  this.populate_examples = function (video_ids) {
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

    return self;
  };

  this.transition_to_playback = function () {
    $("#lightbox").fadeOut(500);
    $("#btn-play-again").fadeOut(500, function () {
      $(this).replaceWith(function () {
        return $("<button id='btn-play-again' class='btn btn-primary'>Try again</button>").fadeIn(500, function () {
          document.onkeypress = function (event) {
            console.log("in transiton to playback " + event);
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

  var start_button_click = function (event) {
    $(".demo-message").hide();

    if (page.ready_to_accept_input) {
      page.ready_to_accept_input = false;

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
}