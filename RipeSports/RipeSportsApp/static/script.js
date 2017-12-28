// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

var googleApiReady = false;
googleApiClientReady = function() {
    gapi.client.setApiKey('AIzaSyCEP6Mt-yoKXgxdJ8et7HFgGSLLJKjTe-Y');
    gapi.client.load('youtube', 'v3', function() {
        googleApiReady = true;
    });
}

// YouTube duration format regex
var iso8601DurationRegex = /(-)?P(?:([\.,\d]+)Y)?(?:([\.,\d]+)M)?(?:([\.,\d]+)W)?(?:([\.,\d]+)D)?T(?:([\.,\d]+)H)?(?:([\.,\d]+)M)?(?:([\.,\d]+)S)?/;

// loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
// creates an <iframe> (and YouTube player)
// after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  event.target.playVideo();
}

function onPlayerStateChange(event) {
  if(event.data === YT.PlayerState.ENDED) {
        stopVideo();
    }
}

function stopVideo() {
  player.stopVideo();
  document.getElementById("player").style.display = "none";
}


function formatDate(league,date) {
    d = date.getDate()
    m = date.getMonth()+1
    y = date.getFullYear()
    return [y,m,d].join('-')
  }

var app = angular.module('myApp', ['ui.bootstrap']);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.factory('ytService', ['$http', '$q', function($http, $q) {
    var service = {};
    /*
        RETURNS:
        results = {
            'title'
            'duration'
            'channel'
            'views'
            'dislikes'
            'likes'
            'favorites'
            'comments'
            'thumbUrl'
            'thumbImg'
            'id'
            'link'
        }
    */
    service.getYtLink = function(searchString) {
        return $q(function(resolve, reject) {
            if(googleApiReady) {
                var ytSearchResults = [];
                var request = gapi.client.youtube.search.list({
                    q: searchString,
                    part: 'snippet',
                    maxResults: 10
                });
                request.execute(function(response) {
                    if(response.result.pageInfo.totalResults == 0) {
                        reject();
                    }
                    var srchItems = response.result.items;
                    var ids = '';
                    srchItems.forEach(function(item, index) {
                        if(item.id.kind == "youtube#video") {
                            vidId = item.id.videoId;
                            vidThumburl = ("thumbnails" in item.snippet) ? item.snippet.thumbnails.default.url : "";
                            vidThumbimg = '<pre><img id="thumb" src="' + vidThumburl + '" alt="No  Image Available." style="width:204px;height:128px"></pre>';
                            ytSearchResults.push({
                                'title': item.snippet.title,
                                'channel': item.snippet.channel,
                                'publishedAt': item.snippet.published_at,
                                'thumbUrl': vidThumburl,
                                'thumbImg': vidThumbimg,
                                'id': vidId,
                                'link': 'https://www.youtube.com/watch?v=' + vidId
                            });
                            ids += ',' + vidId;
                        }
                    });
                    if(ids == '') {
                        reject();
                    }
                    var detailsRequest = gapi.client.youtube.videos.list({
                        part: 'contentDetails,statistics', //add ',statistics' for view count info
                        id: ids
                    })
                    detailsRequest.execute(function(response) {
                        srchItems = response.result.items;
                        srchItems.forEach(function(item, index) {
                            searchResult = ytSearchResults.find(function(sR) {
                                if(sR['id'] == item['id']) {
                                    return sR;
                                }
                            });
                            searchResult['duration'] = item.contentDetails.duration;
                            searchResult['views'] = item.statistics.viewCount;
                            searchResult['dislikes'] = item.statistics.dislikeCount;
                            searchResult['likes'] = item.statistics.likeCount;
                            searchResult['favorites'] = item.statistics.favoriteCount;
                            searchResult['comments'] = item.statistics.commentCount;
                        });
                        resolve(ytSearchResults);
                    })

                })
            }
            else{
                console.log("Google API not ready")
            }
        });
    };
    return service;
}])


app.controller('indexCtrl', ['$scope', '$http', '$location', '$window', '$q', '$timeout', 'ytService', function($scope, $http, $location, $window, $q, $timeout, ytService) {

    var init = function() {
        $scope.setLeague('nba')
        $scope.weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        $scope.years = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]
    }

    $scope.debugSearch = function(entry) {
        //currently unused. helpful for tuning search algs becaue displays results and scoring breakdown of top links found
        var track = {
            'artist': entry.artist,
            'title': entry.title,
            'ytlink': entry.ytlink,
            'entryType': entry.entryType
        };
        if(track.artist === "" && track.title == "" && track.ytlink == "") {
            document.getElementById("artist_input").focus();
            return;
        }
        findNthBestLink(track, 2).then(function(results) {
            $scope.linkData = results
        }, function error(response) {
            $scope.linkData = [{'title':"search failed"}]
        });
    }

    $scope.playHighlight = function(game){
        findNthBestLink(game,1).then(function success(highlightLink){
            //hand off highlightLink to youtube iframe api for playing
            document.getElementById("player").style.display = "inline";
            player.loadVideoById({videoId: highlightLink.id})
        },function error(){
            alert("Highlight not found :(")
        })
    }

    var findNthBestLink = function(game, n) {
        return $q(function(resolve, reject) {
            var favoriteChannels = {
                    "mlb":"MLB",
                    "nba":"Motion Station",
                    "nfl":"NFL"
                }
            var goodWords = ["highlight", "highlights", "recap"]
            var searchString = game.homeTeam+" "+game.awayTeam+" "+game.date+" "+favoriteChannels[$scope.league]
            ytService.getYtLink(searchString).then(function success(results) {
                var scoreIndex = [];
                results.forEach(function(result, i) {
                    var matchScore = i;
                    // See https://stackoverflow.com/a/29153059/1092403 for ISO 8601 example
                    // Extract the hours and mintutes of the duration (assuming no videos are
                    // over a day long)
                    var duration = result['duration'].match(iso8601DurationRegex);
                    var hours = duration[6] === undefined ? 0 : duration[6];
                    var minutes = duration[7] === undefined ? 0 : duration[7];
                    //match uploader
                    if(favoriteChannels[$scope.league] == result['channel']){
                        matchScore -= 10;
                    }
                    //match upload date
                    if(datesCheckOut(result['publishedAt'],game.date)){
                        matchScore -= 5;
                    }
                    //match team names and date
                    if(result['title'].indexOf(game.homeTeam) >= 0) {
                        matchScore -= 1;
                    }
                    if(result['title'].indexOf(game.awayTeam) >= 0) {
                        matchScore -= 1;
                    }
                    if(result['title'].indexOf(game.date) >= 0) {
                        matchScore -= 1;
                    }
                    if(hours > 0){
                        matchScore += 1000;
                    }
                    if(minutes > 10){
                        matchScore += 100;
                    }
                    scoreIndex.push([i, matchScore])
                });
                var bestToWorst = scoreIndex.sort(function(a, b) {
                    return a[1] - b[1];
                })
                var nthBestIndex = bestToWorst[n - 1][0]
                resolve(results[nthBestIndex]);
            }, function error() {
                reject()
            });
        })

    }

    var datesCheckOut = function(uploadDate, gameDate){
        /*TODO*/
        var tolerance = "1w"
        return false
    }

    $scope.setLeague = function(league){
        $scope.league = league
        if (league == "nfl"){
            //TODO: current code to find most recent nfl date is on server, triggered by 0 values. Could be moved to frontend for performance/code consistency
            $scope.loadGamesByWeek(league,0,0)
        }
        else{
            date = new Date()
            $scope.loadGamesByDate(league,date)
        }
        //Load list of recent games to be used for typeahead searching
        $http({
            url: "/recentgames/",
            method: 'POST',
            data: { 'league':$scope.league,
                    'numGames':500}
        }).then(function success(response){
            //Load searchable array of games as strings
            $scope.recentGames = gamesAsStrings(response.data)
        },function error(){
            console.log("No game data found :(")
        })
    }

    //for leagues where games played daily, like nba, mlb, etc
    $scope.loadGamesByDate = function(league,date){
        formattedDate = formatDate(league,date)
        //Load game results to be rendered on page
        $http({
            url: "/gamesByDate/",
            method: 'POST',
            data: { 'league':league,
                    'date':formattedDate}
        }).then(function success(response){
            $scope.games = response.data
        },function error(){
            console.log("No game data found :(")
        })
    }

    //for leagues where games played weekly, like nfl
    $scope.loadGamesByWeek = function(league,week,year){
        $http({
            url: "/gamesByWeek/",
            method: 'POST',
            data: { 'league':league,
                    'week':week,
                    'year':year}
        }).then(function success(response){
            $scope.games = response.data
        },function error(){
            console.log("No game data found :(")
        })
    }

    var gamesAsStrings = function(games){
        return games.map(gameDict => gameDict["awayTeam"] + " @ " + gameDict["homeTeam"] + ", " + gameDict["date"])
    }

    init();

}]);
