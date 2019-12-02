
var currentPage = "/home";
var audioElement = document.createElement('audio');
var timetableData, showInfo;
var tab;

var apiLink = "https://cellafm.airtime.pro/api/";
var streamLink = "https://cellafm.out.airtime.pro/cellafm_a";

function generatePage() {
    console.log("Loading new page " + currentPage);
    
    $.ajax({
        url: currentPage,
        dataType: 'html',
        success: function(data) {
            if (currentPage == "/logout") currentPage = "/login"
            $('#content').html(data);
            updatePage();
            pageUpdater();
        }
    });
    updatePage();
}

function pageUpdater() {
    $.getJSON( apiLink + "live-info", function(data) {
        showInfo = data;
        updatePage();
    });
}

function updateNavPlayer() {
    var css = "fas fa-play";
    
    if(!audioElement.paused) {
        css = "fas fa-pause";
    } 
    $('#icon').attr("class", css);
}

function updateMainPlayer() {
    var cw = $('.main_player').width();
    $('.main_player').css({'height':cw+'px'});
    
    var css = "fas fa-play";
    var buttonText = "Play Now";
    
    if(!audioElement.paused) {
        css = "fas fa-pause";
        buttonText = "Pause Now"
    } 
    
    $('#icon_main').attr("class", css);
    $('#icon_text').html(buttonText);
    
    css = "fa fa-volume-up";
    if (isMuted) {
        css = "fa fa-volume-mute"
    }
    
    $('#volume').attr("class", css);
}

function getDays(days) {
    switch(days) {
        case 0: return timetableData['sunday'];
        case 1: return timetableData['monday'];
        case 2: return timetableData['tuesday'];
        case 3: return timetableData['wednesday'];
        case 4: return timetableData['thursday'];
        case 5: return timetableData['friday'];
        case 6: return timetableData['saturday'];
    }
}

function parseShowTime(show) {
    var showTime = show.split(" ")[1];
    return showTime.substring(0, showTime.length-3);
}

function updatePage() {
    updateNavPlayer();
    
    if (currentPage == "/home") {
        updateMainPlayer();
    }
    
    // Update Live-Info 
    
    
    if (showInfo) {
        var showCurrent = showInfo['currentShow'][0];
        var showName = showCurrent['name'];
        var showDescription = showCurrent['description'];
        var showImg = "url(" + showCurrent['image_path'] + ")";

        if (showDescription.lenght == 0) {
            showDescription = "No Info found..."
        }

        $('#nav_player_img').attr('src', showCurrent['image_path']);
        $('.main_player_info').css('background-image', showImg);
        $('#show_name').html("Currently: " + showName)
        $('#showTitle').html(showName);
        $('#showDescription').html(showDescription);
    } else {
        $('#show_name').html("Loading...")
        $('#showTitle').html("Loading...");
        $('#showDescription').html("Fetching show description");
    }
    
    var date = new Date();
    var day = date.getDay();
    
    $("ul.time_tabs li").each(function(tab) {
        var data_time = $(this).attr('data-time');
        var data_day = data_time.split('-');
        
        if (day == data_day[1] && !tab){
            tab = day;
            $(this).addClass("tab_current");
            $(this).val("Today");
        }
    });
    
    
    $('ul.time_tabs li').click(function(){
		var tab_id = $(this).attr('data-time');
        tab = tab_id;

		$('ul.time_tabs li').removeClass('tab_current');
		$('.time_wrapper').removeClass('current_list');

		$(this).addClass('tab_current');
		$("#"+tab_id).addClass('current_list');
	});
    
    if (timetableData) {
        for (i = 0; i < 7; i++) {
            var timeWrapper = $('#day-' + i);
            var timeList = timeWrapper.children().first();
            var dayData = getDays(i);
        
            timeList.empty();
            
            $.each(dayData, function(key, show) {
                var showName = show.name;
                var startTime = parseShowTime(show.starts);
                var endTime = parseShowTime(show.ends);
                timeList.append('<li class="time_card"> <p>' + startTime + ' - ' + endTime + '</p> <h3>' + showName + '</h3> </li>')
            });
        }
    }
    
    $('#login_btn').click(function() {
        var password = $('input').val();
        console.log("Sending password" + password);

        $.ajax({
            url: "/login",
            type:'POST',
            contentType: "application/json",
            data: JSON.stringify({ "password": password }),
            success: function(data) {
                currentPage = "/admin"
                $('#content').html(data);
                updatePage();
            },
            error: function(data) {
                console.log("Loading error")
                console.log(data)
                $('#content').html(data);
                updatePage();
            }
        });
    });

    
    $("#logout").click(function() {
        currentPage = "/logout"
        generatePage();
    });
    
    $('.artist_card').click(function(){
		var artist_id = $(this).attr('data-id');
        $.ajax({
            url: "/resident/" + artist_id,
            success: function(data) {
                $('#content').html(data);
                updatePage();
                currentPage = "/resident/" + artist_id
            }
        });
	});
    
    $('.editbutton').click(function(){
        var artist = $(this).attr("data-artist");
        $.ajax({
            url: "/api/resident/" + artist,
            success: function(data) {
                console.log(data);
                var json = $.parseJSON(data); 
                $('#editModalLabel').html("You're editing " + json.name + "'s Information!")
                $('#editModalName').val(json.name);
                $('#editModalHeader').val(json.header);
                $('#editModalDesc').val(json.description);
                $('#editModal').modal('show');
            }
        });
    });
    
    var header = $('.res_header');
    var img = $('.res_header').attr('data-img');
    header.css('background-image', 'url(static/uploads/' + img + '.jpg)')
    
    
    $('.delbutton').click(function(){
        var artist = $(this).attr("data-artist");
        $.ajax({
            url: "/api/delete/" + artist,
            success: function(data) {
                generatePage();
            }
        });
    });
    
    $('#showAdd').click(function() {
        $('#addModal').modal('show');
    });
    
        
    $('.back_button').click(function() {
        currentPage = "/residents"
        generatePage();
    });
    
    $('#newArtists').on('submit', function(event){

        event.preventDefault();
         $.ajax({
            url:"/api/add",
            method: 'POST',
            data: new FormData(this),
            contentType: false,
            cache: false,
            processData: false,
            success:function(data) {
                $('#content').html(data);
                updatePage();
                $('.modal-backdrop').remove();
            }
        });
    });
    
    $('#editForm').on('submit', function(event){
        event.preventDefault();
        $.ajax({
            url:"/api/edit",
            method: 'POST',
            data: new FormData(this),
            contentType: false,
            cache: false,
            processData: false,
            success:function(data) {
                $('#content').html(data);
                updatePage();
            }
        })
    });
}

function togglePlayer() {
    if (audioElement.paused) {
        audioElement.play();
    } else {
        audioElement.pause();
    }
    updatePage();
}

function toggleVolume() {
    if (audioElement.volume == 0) {
        audioElement.volume = 1;
    } else {
        audioElement.volume = 0;
    }
    updatePage();
}

function isMuted() {
    if (audioElement.volume == 0) return true;
    return false;
}

$(window).on('resize', function() {
    updatePage();
});

$(document).ready(function() {
    $(audioElement).attr('src', streamLink);
    generatePage();
    
    $('#navlink li').click(function() {
        nextPage = $(this).attr("data-page");
        if (nextPage != currentPage) {
            currentPage = nextPage;
            generatePage();
        }
    });
    
    $('#play').click(togglePlayer);
    
    $('.nav_header').click(function() {
        if (currentPage != "/home") {
            currentPage = "/home";
            generatePage();
        }
    });
    
    $('#admin_login').click(function() {
        if (currentPage != "/admin" && currentPage != "/login") {
            currentPage = "/admin";
            generatePage();
        }
    });
    
    $.getJSON( apiLink + "week-info", function(data) {
        timetableData = data;
        updatePage();
    });
    
    
    
    updatePage();
    pageUpdater();
    setInterval(pageUpdater, 60000);
});



