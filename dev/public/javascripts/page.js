function Page() {
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
}