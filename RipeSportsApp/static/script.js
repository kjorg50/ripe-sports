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
    gapi.client.setApiKey('AIzaSyAwtHoumtgEEHORtGd1ONzz5uLWzm7ytBQ');
    gapi.client.load('youtube', 'v3', function() {
        googleApiReady = true;
    });
}

// YouTube duration format regex
var iso8601DurationRegex = /(-)?P(?:([\.,\d]+)Y)?(?:([\.,\d]+)M)?(?:([\.,\d]+)W)?(?:([\.,\d]+)D)?T(?:([\.,\d]+)H)?(?:([\.,\d]+)M)?(?:([\.,\d]+)S)?/;



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
    service.getYtLink = function(searchString,gameDate,embeddableOnly) {
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
                    type:'video',
                    videoEmbeddable: embeddableOnly ? 'true' : 'any',
                    videoSyndicated: embeddableOnly ? 'true' : 'any'
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

    // loads the IFrame Player API code asynchronously.
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        // creates an <iframe> (and YouTube player)
        // after the API code downloads.
        window.onYouTubeIframeAPIReady = function(){
          $scope.player = new YT.Player('player', {
            height: '390',
            width: '640',
            events: {
              'onReady': onPlayerReady,
              'onStateChange': onPlayerStateChange,
              'onError':onError
            }
          });
        }

    var init = function() {
        $scope.setLeague('mlb')
        $scope.weeks = ['Preseason Week 1', 'Preseason Week 2', 'Preseason Week 3', 'Preseason Week 4', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12', 'Week 13', 'Week 14', 'Week 15', 'Week 16', 'Week 17', 'Wild Card', 'Divisional Round', 'Conference Championships', 'Pro Bowl', 'Super Bowl']
        $scope.years = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018]
        $scope.embeddable = true
        $scope.showYoutubeBackupLink = false
    }


    function onPlayerReady(event) {
        //called when youtube player initialized
    }

    function onPlayerStateChange(event) {
      if(event.data == YT.PlayerState.ENDED) {
            stopVideo();
        }
        if(event.data == -1){
            $scope.embeddable = true
            //$scope.$apply()
        }
    }

    function onError(event){
        $scope.showPlayer = false
        switch(event.data){
            case 2:
                console.log('request contains an invalid parameter value')
                break
            case 5:
                console.log('The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred.')
                break
            case 100:
                console.log('The video requested was not found. This error occurs when a video has been removed (for any reason) or has been marked as private.')
                break
            case 101:
            case 150:
                console.log('Uploader has blocked this content from embedded playback')
                $scope.embeddable = false
                break
            default:
                console.log('Unhandled error code: '+event.data)

        }
        $scope.$apply()
    }

    function stopVideo() {
      $scope.player.stopVideo();
      //document.getElementById("player").style.display = "none";
      $scope.showPlayer = false
    }

    function getSearchParams(league,game){
        switch(league){
            case 'nfl':
                homeTeamWords = game.homeTeam.split(' ')
                homeTeam = homeTeamWords[homeTeamWords.length-1]
                awayTeamWords = game.awayTeam.split(' ')
                awayTeam = awayTeamWords[awayTeamWords.length-1]
                return {
                    'channels':['NFL'],
                    'channelMatch':10,
                    'maxMinutes':20,
                    'keywords':[game.homeTeam,game.awayTeam,'nfl game highlight'].join(' '),
                    'keywordMatch':1,
                    'tryAgainScore':-5,
                    'searchAttempts':[[homeTeam,awayTeam,game.prettyDate,'nfl game highlights'].join(' '),
                                    [homeTeam,awayTeam,'nfl game highlights'].join(' '),
                                    [homeTeam,awayTeam,game.date.replace(/-/g,' '),'nfl game highlight'].join(' ')]
                                }
                break

            case 'mlb':
                return {
                    'channels':['MLB'],
                    'channelMatch':10,
                    'maxMinutes':20,
                    'keywords':[game.homeTeam,game.awayTeam,'highlight'].join(' '),
                    'keywordMatch':1,
                    'tryAgainScore':0,
                    'searchAttempts':[[game.homeTeam,game.awayTeam,game.prettyDate,'full game highlight'].join(' '),
                                    [game.homeTeam,game.awayTeam,'full game highlight'].join(' '),
                                    [game.homeTeam,game.awayTeam,game.date.replace(/-/g,' '),'full game highlight'].join(' ')]
                                }
                break

            case 'nba':
                return {
                    'channels':['MLG'],
                    'channelMatch':5,
                    'maxMinutes':20,
                    'keywords':[game.homeTeam,game.awayTeam,'highlight'].join(' '),
                    'keywordMatch':20,
                    'tryAgainScore':-10,
                    'searchAttempts':[[game.homeTeam,game.awayTeam,game.prettyDate,'full game highlight'].join(' '),
                                    [game.homeTeam,game.awayTeam,'full game highlight'].join(' '),
                                    [game.homeTeam,game.awayTeam,game.date.replace(/-/g,' '),'full game highlight'].join(' ')]
                                }
                break
        }

    }

    debugSearch = function(game,embeddableOnly) {
            getBestLink(game, embeddableOnly).then(function(results) {
                $scope.linkData = results
            }, function error(response) {
                $scope.linkData = ["failed"]
            });
        
    }

    //tests all the games on the page. recursive because of asynchronous nature of finding links. call testAlg(0) to use it
    $scope.testAlg = function(i) {
        numSuccess = 0
        numFail = 0
        failedGames = []
        if(i+1<$scope.games.length){
            game = $scope.games[i]
            console.log("testing "+game.awayTeam + " at " + game.homeTeam)
            getBestLink(game, 0).then(function(results) {
                best = results[0]
                if(best.title.includes(game.homeTeam) & best.title.includes(game.awayTeam)){
                    numSuccess += 1
                }
                else{
                    numFail += 1
                    console.log("FAILURE: " +game.awayTeam + " at " + game.homeTeam + " --->   " + best.title)
                }
                $scope.testAlg(i+1)
            }, function error(response) {
                alert("no results")
            });
        }
    }

    $scope.playHighlight = function(game,embeddableOnly){
        $scope.currGame = game
        if ($scope.debug){
            $scope.linkData = []
            debugSearch(game)
        }
        else{
            getBestLink(game,embeddableOnly).then(function success(results){
                best = results[0]
                if (embeddableOnly){
                    $scope.showYoutubeBackupLink = true
                }
                else{
                    $scope.vidUrl = best.link
                    $scope.showYoutubeBackupLink = false
                }
                //hand off highlightLink to youtube iframe api for playing
                $scope.showPlayer = true
                $scope.player.loadVideoById({videoId: best.id})
            },function error(){
                alert("Highlight not found :(")
            })
        }
    }

    $scope.search = function(searchStr){
        $scope.playHighlight($scope.recentGames[searchStr])
    }

    //return the degree to which the team name matches
    var keywordMatch = function(keywords,title){
        numMatch = 0
        teamWords = keywords.toLowerCase().split(' ')
        teamWords.forEach(function(word,i){
            if(title.toLowerCase().includes(word)){
                numMatch += 1
            }
        })
        return (numMatch/teamWords.length).toFixed(2)
    }

    var getBestLink = function(game,embeddableOnly) {
        return $q(function(resolve, reject) {
            ytHelp = getSearchParams($scope.league,game)
            bestScoreSoFar = 10000
            bestResultSoFar = null
            scoredResults = []
            ytHelp['searchAttempts'].forEach(function(searchString,j){
                ytService.getYtLink(searchString,game.date,embeddableOnly).then(function success(results) {
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
                        matchScore -= keywordMatch(ytHelp['keywords'],result['title'])*ytHelp['keywordMatch']

                        if(hours > 0){
                            matchScore += 1000;
                        }
                        if(minutes > ytHelp['maxMinutes']){
                            matchScore += 100;
                        }
                        result['algScore']=matchScore //this is for debugging purposes
                        result['originalOrder']=i//this is for debugging purposes
                        scoredResults.push([result,matchScore])
                        bestResultSoFar = matchScore < bestScoreSoFar ? result : bestResultSoFar
                        bestScoreSoFar = matchScore < bestScoreSoFar ? matchScore : bestScoreSoFar
                    })
                    if(bestScoreSoFar < ytHelp['tryAgainScore'] | j+1 == ytHelp['searchAttempts'].length){
                        scoredResults.sort(function(a,b){
                            return a[1]-b[1]
                        })
                        if (scoredResults[0][0] != bestResultSoFar){
                            console.log('best result got lost')
                        }
                        resolve(scoredResults.map(function(el){
                            return el[0]
                        }));
                    }
                }, function error() {
                    reject()
                });
            })
        })

    }

    $scope.setLeague = function(league){
        $http({
            url: "/recentgames/",
            method: 'POST',
            data: { 'league':league,
                    'numGames':500}
        }).then(function success(response){
            //deactivate previous league tab
            var tabId = '#'+$scope.league+"-tab"
            var tab = angular.element(document.querySelector(tabId))
            tab.removeClass('active');
            //activate current league
            tabId = '#'+league+"-tab"
            tab = angular.element(document.querySelector(tabId))
            tab.addClass('active');
            $scope.title = "Recent " + league.toUpperCase() + " Games"
            //Load searchable array of games as strings
            $scope.recentGames = searchableGames(response.data)
            $scope.searchbarGames = Object.keys($scope.recentGames)
            $scope.games = response.data.slice(0,20)
            $scope.league = league
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
            $scope.title = "Games on " + formattedDate
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
            $scope.title = week + " " + year + " Games"
            $scope.games = response.data
        },function error(){
            console.log("No game data found :(")
        })
    }

    var searchableGames = function(games){
        out = {}
        games.forEach(function(game){
            out[gameAsString(game)]=game
        })
        return out
    }

    var gameAsString = function(game){
        homeTeamWords = game.homeTeam.split(' ')
        homeTeam = homeTeamWords[homeTeamWords.length-1]
        awayTeamWords = game.awayTeam.split(' ')
        awayTeam = awayTeamWords[awayTeamWords.length-1]
        return awayTeam + " @ " + homeTeam + " " + game.date
    }

    init();

}]);
