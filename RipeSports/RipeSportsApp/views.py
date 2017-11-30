from django.shortcuts import render
from django.http import HttpResponse
import requests


def index(request):
    response = requests.get("http://api.espn.com/v1/sports/baseball/mlb/calendar")
    print response.text
    return render(request,'RipeSportsApp/index.html');# Create your views here.
