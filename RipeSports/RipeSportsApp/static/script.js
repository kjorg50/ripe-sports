var googleApiReady = false;
googleApiClientReady = function() {
    gapi.client.setApiKey('AIzaSyCEP6Mt-yoKXgxdJ8et7HFgGSLLJKjTe-Y');
    gapi.client.load('youtube', 'v3', function() {
        googleApiReady = true;
    });
}

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


var app = angular.module('myApp', []);

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
        $scope.loadNBAGames('Thursday, January 4','2017')
        $scope.weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        $scope.years = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]
        favoriteChannels = {
            "nba":"Motion Station",
            "nfl":"NFL"
        }
    }

    $scope.debugSearch = function(entry) {
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
            var searchString = game.homeTeam+" "+game.awayTeam+" "+game.date+" "+favoriteChannels[$scope.sport]
            ytService.getYtLink(searchString).then(function success(results) {
                var scoreIndex = [];
                results.forEach(function(result, i) {
                    var matchScore = i;
                    //match uploader
                    if(favoriteChannels[$scope.sport] == result['channel']>=0){
                        matchScore -= 1000;
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

    $scope.loadNFLGames = function(week,year){
        /*TODO convert week and year into date format then call loadGames('nfl',date)*/
        $http({
            url: "/getnflgames/",
            method: 'POST',
            data: {'week':week,
                    'year':year}
        }).then(function success(response){
            //$scope.games = JSON.parse(response.data)
            $scope.games = response.data
        },function error(){
            console.log("No game data found :(")
        })
    }

    $scope.loadNBAGames = function(date,year){
        $http({
            url: "/getnbagames/",
            method: 'GET'
        }).then(function success(response){
            $scope.games = []
            allGames = response.data
            allGames.forEach(function(game){
                if(game.year == year && game.date == date){
                    $scope.games.push({
                        "homeTeam":game.homeTeam,
                        "awayTeam":game.awayTeam,
                        "date":game.date
                    })
                }
            })
        },function error(){
            console.log("No game data found :(")
        })
    }

    init();

}]);
