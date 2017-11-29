var googleApiReady = false;
googleApiClientReady = function() {
    gapi.client.setApiKey('AIzaSyCEP6Mt-yoKXgxdJ8et7HFgGSLLJKjTe-Y');
    gapi.client.load('youtube', 'v3', function() {
        googleApiReady = true;
    });
}

var app = angular.module('myApp', []);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.factory('ytService', ['$http', '$q', function($http, $q) {
    var service = {};

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
                            vidTitle = item.snippet.title;
                            vidThumburl = ("thumbnails" in item.snippet) ? item.snippet.thumbnails.default.url : "";
                            vidThumbimg = '<pre><img id="thumb" src="' + vidThumburl + '" alt="No  Image Available." style="width:204px;height:128px"></pre>';
                            ytSearchResults.push({
                                'title': vidTitle,
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
        $scope.result = ""
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

    $scope.search = function(entry) {
        findNthBestLink(entry, 1).then(function(best) {
            $scope.result = best['link'];
        }, function error(response) {
            $scope.result = "ERROR"
        });
    }

    var findNthBestLink = function(entry, n) {
        return $q(function(resolve, reject) {
            var searchString = entry + " highlights";
            ytService.getYtLink(searchString).then(function success(results) {
                badKeywords = ["full game", "spoiler"]
                goodKeywords = ["highlight", "game", "week","nfl"]

                badKeywords = badKeywords.filter(function(bK) {
                    if(searchString.indexOf(bK) == -1) {
                        return bK;
                    }
                });

                var scoreIndex = [];
                results.forEach(function(result, i) {
                    var matchScore = i;
                    badKeywords.forEach(function(bK) {
                        if(result['title'].indexOf(bK) != -1) {
                            matchScore += 1.1;
                        }
                    })
                    goodKeywords.forEach(function(gK) {
                        if(result['title'].indexOf(gK) != -1) {
                            matchScore -= 1.1;
                        }
                    })
                    if(result['title'].indexOf(entry) != -1) {
                        matchScore -= 5;
                    }
                    if(result['title'].indexOf(entry) != -1) {
                        matchScore -= 3;
                    }
                    scoreIndex.push([i, matchScore])
                });
                var bestToWorst = scoreIndex.sort(function(a, b) {
                    return a[1] - b[1];
                })
                if(n==2){
                    searchResults = []
                    for(j=0;j<5;j++){
                        resultDetails = results[bestToWorst[j][0]]
                        resultDetails['originalOrder'] = bestToWorst[j][0]
                        resultDetails['algScore'] = bestToWorst[j][1]
                        searchResults.push(resultDetails)
                    }
                    resolve(searchResults);
                }
                var nthBestIndex = bestToWorst[n - 1][0]
                resolve(results[nthBestIndex]);
            }, function error() {
                //try getting link using poormansjams server's algorithm implementation (which for some lame reason yields different results)
                $http({
                    url: "getYtlink/",
                    method: 'POST',
                    data: track
                }).then(function success(response) {
                    resolve(response.data);
                }, function error(response) {
                    reject();
                });
            });
        })

    }



    init();

}]);