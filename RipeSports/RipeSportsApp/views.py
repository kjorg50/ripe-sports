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
        if year + week == 0:
            curr_nfl_week = get_current_nfl_week()
            week = curr_nfl_week['current_week']
            year = curr_nfl_week['year']
        prettyWeek = "Week "+str(week)
        games = list(Game.objects.filter(prettyDate=prettyWeek,league=league,date__year=year).values('homeTeam', 'awayTeam','prettyDate'))
        #Special django serializer needed for serializing objects
        return HttpResponse(json.dumps(games, cls=DjangoJSONEncoder),content_type='application/json')


def getRecentGames(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        league = postData.get("league")
        numGames = postData.get("numGames")
        today = date.today()
        #get last <numGames> games played
        games = list(Game.objects.filter(league=league, date__lte=today).order_by('-date').values('homeTeam', 'awayTeam', 'date')[:numGames])
        #Special django serializer needed for serializing objects
        return HttpResponse(json.dumps(games, cls=DjangoJSONEncoder),content_type='application/json')
"""
Functions for NFL date calculations
"""


def get_nfl_start_date(year):
    """
    NFL Season starts first Thursday after Labor day, which is first Monday
    in September.

    September is the 9th month of the year, and Thursday is 3 days after Monday.
    Find first Monday of month (Labor Day), then add 3 days to get start of NFL season.
    """
    first_day_month, _ = calendar.monthrange(2017, 9)
    first_date = date(2017, 9, 1)
    delta = (calendar.MONDAY - first_day_month) % 7
    return first_date + timedelta(days=(delta + 3))


def get_current_nfl_week():
    """
    Regular football season is 115 days
    """
    year = datetime.now().year
    curr_month = datetime.now().year
    if curr_month < 9:
        year -= 1
    nfl_start_date = get_nfl_start_date(year)
    nfl_start_day = nfl_start_date.day
    curr_date = date.today()

    if (curr_date.month == 9 and curr_date.day < nfl_start_day):
        year -= 1

    nfl_end_date = get_nfl_start_date(year) + timedelta(days=115)
    if curr_date > nfl_end_date:
        curr_date = nfl_end_date
    curr_week = ((curr_date - nfl_start_date).days / 7) + 1
    if curr_week > 17:
        curr_week = 17

    output = {
        "current_week": curr_week,
        "year": year
        }

    return output
