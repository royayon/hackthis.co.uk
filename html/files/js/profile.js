$(function() {
    var uid = $('article.profile').attr('data-uid');

    $('.profile').on('mouseover', '.removefriend', function(e){
        $(this).html('<i class="icon-removefriend"></i> Remove');
    }).on('mouseout', '.removefriend', function(e){
        $(this).html('<i class="icon-user"></i> Friends');
    });


    $('.profile-feed .remove').click(function(){
        var fid = $(this).attr('data-fid');
        var $elem = $(this).closest('li');

        $.confirm({
            title   : 'Delete Confirmation',
            message : 'Are you sure you want to remove this activity from your feed? <br />It cannot be restored at a later time! Continue?',
            buttons : {
                Yes : {
                    action: function(){
                        // Remove item from feed
                        var uri = '/files/ajax/user.php?action=feed.remove&id=' + fid;
                        $.getJSON(uri, function(data) {
                            if (data.status) {
                                $elem.slideUp();
                            }
                        });
                    }
                },
                No  : {}
            }
        });
    });

    $('body').on('click', '.addfriend, .acceptfriend, .removefriend', function(e) {
        e.preventDefault();
        var $this = $(this);

        if ($this.hasClass('addfriend') || $this.hasClass('acceptfriend'))
            var uri = '/files/ajax/user.php?action=friend.add&uid=';
        else
            var uri = '/files/ajax/user.php?action=friend.remove&uid=';
        uri += uid;

        $.getJSON(uri, function(data) {
            if ($this.hasClass('removefriend-hide')) {
                $this.closest('li').fadeOut();
            } else if (data.status) {
                if ($this.hasClass('addfriend')) {
                    $this.html('Pending').removeClass('addfriend').addClass('button-disabled');
                } else if ($this.hasClass('acceptfriend')) {
                    $this.html('<i class="icon-user"></i> Friends').removeClass('acceptfriend').addClass('button-blank removefriend');
                } else if ($this.hasClass('removefriend')) {
                    $this.html('<i class="icon-addfriend"></i> Add friend').removeClass('removefriend button-blank').addClass('addfriend');
                }
            }
        });
    });

    var $music = $('.profile-music');
    if ($music.length) {
        var lastfm = $music.attr('data-user');
        var uri = '/files/ajax/user.php?action=music&id=' + lastfm;

        $.getJSON(uri, function(data) {
            $music.removeClass('loading');
            if (data.status) {
                var ul = $("<ul>");
                $.each(data.music, function(index, value) {
                    var li = $("<li>").html('<a class="hide-external" href="http://www.last.fm/music/' + value.artist + '">' + value.artist + '</a> · ' + value.song);
                    ul.append(li);
                });

                $music.html(ul);
            } else {
                $music.text('Error loading data');
            }
        });
    }


    $('#friends-search input').on('keyup', function(e) {
        if (e.which == 27 || e.keyCode == 27) {
            $(this).val("");
        }

        var term = $(this).val().replace(/[^a-zA-Z 0-9]+/g,'');
        if (term.length < 1) {
            $('.users-list li').show();
            return false;
        }

        var re = new RegExp(term, 'i');
        $('.users-list li').each(function() {
            var username = $(this).find('span').text();
            if(!username.match(re))
                $(this).hide();
        });
    });






    // User stats UI stuff
    var $details = $('.profile-details');
    var graph_start = $details.attr('data-graph-start');
    var graph_end = $details.attr('data-graph-end');

    $details.css({'min-height': $details.outerHeight()});
    $stats = $('<div class="profile-stats">\
                    <a href="#" class="close"><i class="icon-cross"></i></a>\
                    <div class="loading"><i class="icon-clock"></i></div>\
                    <div class="profile-stats-extra">\
                        <div id="profile-stats-chart"></div>\
                        <div class="more"></div>\
                    </div>\
                </div>').hide();

    $details.find('.show-posts, .show-articles, .show-karma').on('click', function(e) {
        e.preventDefault();

        var type = '';
        if ($(this).hasClass('show-posts'))
            type = 'posts'
        else
            type = 'articles'
        var uri = '/files/ajax/user.php?action=graph&type='+type+'&uid='+uid;

        $.when($details.children('ul').fadeOut()).then(function() {
            $stats.clone().appendTo($details).fadeIn(function() {
                $.getJSON(uri, function(data) {
                    $details.find('.loading').hide();
                    $details.find('.profile-stats-extra').slideDown();
                    drawChart(data['graph']);

                    if (data['data'] && data['data'].length) {
                        $ul = $('<ul>');
                        $.each(data['data'], function(index, data) {
                            $a = $('<a>', {href: '/forum/'+data.slug, text: data.title, class: 'strong'});
                            $time = $('<time>', {datetime: data.time, class: 'dark'});
                            $li = $('<li>', {text: data.body}).prepend('<br/>').prepend($time).prepend($a);
                            $li.appendTo($ul);
                        });
                        $details.find('.profile-stats-extra .more').append($ul);
                    }
                }); 
            });
        });
    })


    $details.on('click', '.close', function(e) {
        e.preventDefault();

        $.when($stats.fadeOut()).then(function() {
            $details.children('.profile-stats').slideUp(function() {
                $details.children('.profile-stats').remove();
                $details.children('ul').fadeIn();
            });
        });
    });



    function drawChart(tmpData) {
        var data = [];
        var yMax = 5;

        // Fill in gaps in data
        var dmy = graph_end.split("/");
        var end = new Date(dmy[2], dmy[1] - 1, dmy[0]);
        dmy = graph_start.split("/");
        var d = new Date(dmy[2], dmy[1] - 1, dmy[0]);
        while(1) {
            if (d <= end) {
                dStr = (d.getDate()>9?'':'0')+d.getDate()+'/'+(d.getMonth()>=9?'':'0')+(d.getMonth()+1)+'/'+d.getFullYear();
                c = 0;
                // lookup date in tmpData
                for(i = 0; i < tmpData.length; i++) {
                    if (tmpData[i].d == dStr) {
                        c = parseInt(tmpData[i].c);
                        break;
                    }
                }

                if (c > yMax) 
                    yMax = c;

                // add to array
                obj = { d: dStr, c: c}
                data.push(obj);
            } else
                break;
            d.setDate(d.getDate()+1);
        }

        yMax += (yMax % 5);

        var margin = {top: 10, right: 10, bottom: 20, left: 20},
            width = $('#profile-stats-chart').width() - margin.left - margin.right,
            height = 150 - margin.top - margin.bottom;

        var graph = d3.select("#profile-stats-chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("id", "visualization")
            .attr("xmlns", "http://www.w3.org/2000/svg")
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var format = d3.time.format("%d/%m/%Y");

        //var xscale = d3.time.scale().domain([format.parse(data[0].d), format.parse(data[data.length-1].d)]).range([0, width]);
        var xscale = d3.time.scale().domain([format.parse(graph_start), format.parse(graph_end)]).range([0, width]);
        var yscale = d3.scale.linear().domain([0,yMax]).range([height,0]);
        var line = d3.svg.line()
          .interpolate("linear")
          .x(function(n) { return xscale(format.parse(n.d)) })
          .y(function(n) { return yscale(n.c) })


        // Axis
        var xAxis = d3.svg.axis()
            .scale(xscale)
            .orient("bottom")
            .ticks(d3.time.days, 1)
            .tickFormat(d3.time.format('%d %b'))
            .tickSize(4, 0, 0);

        graph.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(-2," + height + ")")
            .call(xAxis);

        var yAxis = d3.svg.axis()
            .scale(yscale)
            .orient("left")
            .ticks(4)
            .tickSize(4, 0, 0);

        graph.append("g")
                .attr("class", "x axis")
                .call(yAxis)


        var path = graph.append("path")
          .attr("d", line(data))
          .attr("stroke-width", "1")
          .attr("fill", "none");

        var totalLength = path.node().getTotalLength();

        path
          .attr("stroke-dasharray", totalLength + " " + totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition()
            .duration(1000)
            .ease("linear")
            .attr("stroke-dashoffset", 0);
    }
});