import calendar
from datetime import date, datetime, timedelta
import json

from django.shortcuts import render
from django.http import HttpResponse
from pprint import pprint


def index(request):
    return render(request,'RipeSportsApp/index.html');# Create your views here.


def getNFLGames(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        #Post request holds week and year for which the games are wanted
        year = postData["year"]
        week = postData['week']
        if (week+year==0):
            curr_nfl_week = get_current_nfl_week()
            week = curr_nfl_week['current_week']
            year = curr_nfl_week['year']
        with open("conf/nflGames.json","r") as nflJSON:
            allGames = json.load(nflJSON)
            games = filter((lambda x: x['week'] == week and x['year'] == year),allGames)
    return HttpResponse(json.dumps(games),content_type='application/json')

def getNBAGames(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        #Post request holds week and year for which the games are wanted
        year = postData["year"]
        date = postData["date"]
        with open("conf/nbaGames.json","r") as nbaJSON:
            allGames = json.load(nbaJSON)
            games = filter((lambda x: x['date'] == date and x['year'] == year),allGames)
    return HttpResponse(json.dumps(games),content_type='application/json')
    allGames = open("conf/nbaGames.json","r")
    return HttpResponse(allGames.read(),content_type='application/json')

def getMLBGames(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        #Post request holds week and year for which the games are wanted
        year = postData["year"]
        date = postData["date"]
        with open("conf/mlbGames.json","r") as mlbJSON:
            allGames = json.load(mlbJSON)
            games = filter((lambda x: x['date'] == date and x['year'] == year),allGames)
    return HttpResponse(json.dumps(games),content_type='application/json')
    allGames = open("conf/mlbGames.json","r")

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
