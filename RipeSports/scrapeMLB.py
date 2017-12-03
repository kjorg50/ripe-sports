#!/usr/bin/env python

import requests
import json
import os

from bs4 import BeautifulSoup
"""
TEAM_NAMES = {
    "ANA": "Anaheim Angels",
    "ARI": "Arizona Diamondbacks",
    "ATL": "Atlanta Braves",
    "BAL": "Baltimore Orioles",
    "BOS": "Boston Red Sox",
    "CHC": "Chicago Cubs",
    "CHW": "Chicago White Sox",
    "CIN": "Cincinatti Reds",
    "CLE": "Cleveland Indians",
    "COL": "Colorado Rockies",
    "DET": "Detroit Tigers",
    "FLA": "Florida Marlins",
    "HOU": "Houston Astros",
    "KC": "Kansas City Royals",
    "LAA": "Los Angeles Angels",
    "LAD": "Los Angeles Dodgers",
    "MIA": "Miami Marlins",
    "MIL": "Milwaukee Brewers",
    "MIN": "Minnesota Twins",
    "MTL": "Montreal Expos",
    "NYM": "New York Mets",
    "NYY": "New York Yankees",
    "OAK": "Oakland Athletics",
    "PHI": "Philadelphia Phillies",
    "PIT": "Pittsburgh Pirates",
    "SD": "San Diego Padres",
    "SEA": "Seattle Mariners",
    "SF": "San Francisco Giants",
    "SFG": "San Francisco Giants",
    "STL": "St Louis Cardinals",
    "TB": "Tampa Bay Rays",
    "TEX": "Texas Rangers",
    "TOR": "Toronto Blue Jays",
    "WSH": "Washington Nationals",
    "WAS": "Washington Nationals",
}
"""
def getAllMLBGames():
    games = []
    for year in range(2005, 2018):
        for month in range(1,13):
            for day in range(1, 32, 3):
                print year, month, day
                try:
                    strMonth = str(month) if month >= 10 else "0"+str(month)
                    strDay = str(day) if day >= 10 else "0"+str(day)
                    url = "http://www.espn.com/mlb/schedule/_/date/"+str(year)+strMonth+strDay
                    html = requests.get(url)
                    soup = BeautifulSoup(html.text, 'html.parser')
                    for table in soup.find_all('table'):
                        if table.get('class')==["schedule","has-team-logos","align-left"]:
                            date = table.find_previous("h2").string
                            for tbody in table.find_all('tbody'):
                                for tr in tbody.find_all('tr'):
                                    game = {"date":date,
                                            "year":year}
                                    tds = tr.find_all('td')
                                    homeTd = tds[1]
                                    abbr = homeTd.find_next('abbr')
                                    game['homeTeam'] = abbr['title']
                                    awayTd = tds[0]
                                    abbr = awayTd.find_next('abbr')
                                    game['awayTeam'] = abbr['title']
                                    games.append(game)
                except Exception as e:
                    pass
    return games


if __name__ == '__main__':
    allGames = getAllMLBGames()
    with open('conf/mlbGames.json', 'w+') as outfile:
        json.dump(allGames, outfile)
