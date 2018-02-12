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

//format javascript date object into sql date format used to index games
function formatDate(date) {
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
    service.getYtLink = function(searchString,gameDate) {
        //searchString = "Boston Celtics Toronto Raptors full game highlight 2018 february 06"
        endDate = new Date(gameDate)
        endDate.setDate(endDate.getDate()+4)
        endDate = formatDate(endDate)
        return $q(function(resolve, reject) {
            if(googleApiReady) {
                var ytSearchResults = [];
                var request = gapi.client.youtube.search.list({
                    q: searchString,
                    part: 'snippet',
                    maxResults: 10,
                    publishedAfter:gameDate+"T00:00:00Z",
                    publishedBefore:endDate+"T00:00:00Z",
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
                                'publishedAt': item.snippet.publishedAt,
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
        searchSettings = {
            'nba':{
                'channels':['MLG'],
                'channelMatch':5,
                'maxMinutes':15,
                'searchSupplement':'full game highlight',
                'goodWords':['highlight','recap'],
                'teamNameMatch':10,
                'tryAgainScore':0
            },
            'nfl':{
                'channels':['NFL'],
                'channelMatch':10,
                'maxMinutes':10,
                'searchSupplement':'',
                'goodWords':['highlight','recap'],
                'teamNameMatch':1,
                'tryAgainScore':0
            },
            'mlb':{
                'channels':['MLB'],
                'channelMatch':10,
                'maxMinutes':10,
                'searchSupplement':'',
                'goodWords':['highlight','recap'],
                'teamNameMatch':1,
                'tryAgainScore':0
            }
        }
    }

    debugSearch = function(game) {
        for(i=0;i<4;i++){
            findNthBestLink(game, i).then(function(results) {
                $scope.linkData.push(results)
            }, function error(response) {
                $scope.linkData = ["failed"]
            });
        }
        
    }

    $scope.testAlg = function() {
        numSuccess = 0
        numFail = 0
        failedGames = []
        $scope.games.forEach(function(game){
            findNthBestLink(game, 1).then(function(results) {
                console.log("test "+game.awayTeam + " at " + game.homeTeam)
                if(results.title.includes(game.homeTeam) & results.title.includes(game.awayTeam)){
                    numSuccess += 1
                }
                else{
                    numFail += 1
                    console.log("FAILURE: " +game.awayTeam + " at " + game.homeTeam + " --->   " + results.title)
                }
                if (game == $scope.games[$scope.games.length-1]){
                            console.log(numSuccess + "/" + (numSuccess+numFail) + "successful. ")

                }
            }, function error(response) {
                alert("no results")
            });
        })
    }

    $scope.playHighlight = function(game){
        if ($scope.debug){
            $scope.linkData = []
            debugSearch(game)
        }
        else{
            findNthBestLink(game,1).then(function success(highlightLink){
                //hand off highlightLink to youtube iframe api for playing
                document.getElementById("player").style.display = "inline";
                player.loadVideoById({videoId: highlightLink.id})
            },function error(){
                alert("Highlight not found :(")
            })
        }
    }

    //return the degree to which the team name matches
    var teamNameMatch = function(team,title){
        numMatch = 0
        teamWords = team.split()
        teamWords.forEach(function(word,i){
            if(title.includes(word)){
                numMatch += 1
            }
        })
        return (numMatch/teamWords.length).toFixed(2)
    }

    var findNthBestLink = function(game, n) {
        return $q(function(resolve, reject) {
            ytHelp = searchSettings[$scope.league]
            searchAttempts = [
                [game.homeTeam,game.awayTeam,game.prettyDate,ytHelp['searchSupplement']].join(' '),
                [game.homeTeam,game.awayTeam,ytHelp['searchSupplement']].join(' '),
                [game.homeTeam,game.awayTeam,game.date.replace(/-/g,' '),ytHelp['searchSupplement']].join(' ')
            ]
            bestScoreSoFar = 10000
            bestResultSoFar = null
            searchAttempts.forEach(function(searchString,j){
                ytService.getYtLink(searchString,game.date).then(function success(results) {
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
                        if(ytHelp['channels'].includes(result['channel'])){
                            matchScore -= ytHelp['channelMatch'];
                        }
                        //match team names and date
                        matchScore -= teamNameMatch(game.homeTeam,result['title'])*ytHelp['teamNameMatch']
                        matchScore -= teamNameMatch(game.awayTeam,result['title'])*ytHelp['teamNameMatch']
                        //if(result['title'].indexOf(game.homeTeam) >= 0) {
                        //    matchScore -= ytHelp['teamNameMatch'];
                        //}
                        //if(result['title'].indexOf(game.awayTeam) >= 0) {
                        //    matchScore -= ytHelp['teamNameMatch'];
                        //}
                        if(hours > 0){
                            matchScore += 1000;
                        }
                        if(minutes > ytHelp['maxMinutes']){
                            matchScore += 100;
                        }
                        result['algScore']=matchScore //this is for debugging purposes
                        result['originalOrder']=i//this is for debugging purposes
                        scoreIndex.push([i, matchScore])    
                    });
                    var bestToWorst = scoreIndex.sort(function(a, b) {
                        return a[1] - b[1];
                    })
                    var nthBestIndex = bestToWorst[n - 1][0]
                    if(bestToWorst[n-1][1] < ytHelp['tryAgainScore']){
                        resolve(results[nthBestIndex]);
                    }
                    else{
                        bestResultSoFar = bestToWorst[n-1][1] < bestScoreSoFar ? results[bestToWorst[n-1][0]] : null
                        if(j == searchAttempts.length-1){
                            //no results scored better than the threshold, so send the best scored
                            resolve(bestResultSoFar)
                        }
                    }
                    }, function error() {
                    reject()
                });
            })
        })

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
        formattedDate = formatDate(date)
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
