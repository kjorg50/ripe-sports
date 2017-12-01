from django.shortcuts import render
from django.http import HttpResponse
import datetime, nflgame, json
from pprint import pprint


def index(request):
    games = nflgame.games(2013, week=1)
    #pprint(games[0].__dict__.keys())
    #print 'home',games[0].away
    return render(request,'RipeSportsApp/index.html');# Create your views here.


def getNFLGames(request):
    pprint(vars(request.POST))
    if request.method=="POST":
        postData = json.loads(request.body)
        #Post request holds week and year for which the games are wanted
        year = postData["year"]
        week = postData['week']
        games = nflgame.games(year,week=week)
    else:
        #GET request responded to with all games of most recent week
        #TODO
        year = datetime.date.today().year #TODO check if this years season has begun
        week = 12 #datetime.date.today().week
        games = nflgame.games(year,week);
    output = []
    for game in games:
        output.append({
                "homeTeam":game.home,
                "awayTeam":game.away,
                "date": "Week "+str(week)
            })
    pprint(json.dumps(output))
    return HttpResponse(json.dumps(output),content_type='application/json')
