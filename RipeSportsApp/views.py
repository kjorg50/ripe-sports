import calendar
from datetime import date, datetime, timedelta
import json
from models import *
from django.shortcuts import render
from django.http import HttpResponse
from pprint import pprint
from django.core.serializers.json import DjangoJSONEncoder



def index(request):
    return render(request,'RipeSportsApp/index.html');# Create your views here.

def getGamesByDate(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        #Post request holds date for which the games are wanted
        league = postData.get("league")
        date = postData.get("date")
        games = list(Game.objects.filter(date=date,league=league).values('homeTeam', 'awayTeam','prettyDate','date'))
        #Special django serializer needed for serializing objects
        return HttpResponse(json.dumps(games, cls=DjangoJSONEncoder),content_type='application/json')

def getGamesByWeek(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        #Post request holds week and year for which the games are wanted
        league = postData.get("league")
        year = postData.get("year")
        week = postData.get("week")
        games = list(Game.objects.filter(prettyDate=week,league=league,date__year=year).values('homeTeam', 'awayTeam','prettyDate','date'))
        #Special django serializer needed for serializing objects
        return HttpResponse(json.dumps(games, cls=DjangoJSONEncoder),content_type='application/json')


def getRecentGames(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        league = postData.get("league")
        numGames = postData.get("numGames")
        today = date.today()
        #get last <numGames> games played
        games = list(Game.objects.filter(league=league, date__lte=today).order_by('-date').values('homeTeam', 'awayTeam', 'prettyDate','date')[:numGames])
        #Special django serializer needed for serializing objects
        return HttpResponse(json.dumps(games, cls=DjangoJSONEncoder),content_type='application/json')
