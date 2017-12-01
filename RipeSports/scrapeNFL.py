#!/usr/bin/env python

import requests
import json
import os

from bs4 import BeautifulSoup

TEAM_NAMES = {
    "ARI": "Arizona Cardinals",
    "ATL": "Atlanta Falcons",
    "BAL": "Baltimore Ravens",
    "BUF": "Buffalo Bills",
    "CAR": "Caronlina Panthers",
    "CHI": "Chicago Bears",
    "CIN": "Cincinatti Bengals",
    "CLE": "Cleveland Browns",
    "DAL": "Dallas Cowboys",
    "DEN": "Denver Broncos",
    "DET": "Detroit Lions",
    "GB": "Green Bay Packers",
    "HOU": "Houston Texans",
    "IND": "Indianapolis Colts",
    "JAX": "Jacksonville Jaguars",
    "KC": "Kansas City Cheifs",
    "LAC": "Los Angeles Chargers",
    "LAR": "Los Angeles Rams",
    "MIA": "Miami Dolphins",
    "MIN": "Minnesota Vikings",
    "NE": "New England Patriots",
    "NO": "New Orleans Saints",
    "NYG": "New York Giants",
    "NYJ": "New York Jets",
    "OAK": "Oakland Raiders",
    "PHI": "Philadelphia Eagles",
    "PIT": "Pittsburgh Steelers",
    "SD": "San Diego Chargers",
    "SEA": "Seattle Seahawks",
    "SF": "San Francisco 49ers",
    "STL": "St Louis Rams",
    "TB": "Tampa Bay Buccaneers",
    "TEN": "Tennessee Titans",
    "WAS": "Washington Redskins"
}

def getAllNFLGames():
    games = []
    for week in range(1,18):
        try:
            url = "http://www.espn.com/nfl/schedule/_/week/"+str(week)
            html = requests.get(url)
            soup = BeautifulSoup(html.text, 'html.parser')
            for table in soup.find_all('table'):
                if table.get('class') == ["schedule", "has-team-logos", "align-left"]:
                    for tbody in table.find_all('tbody'):
                        for tr in tbody.find_all('tr'):
                            game = {"week": week}
                            tds = tr.find_all('td')
                            homeTd = tds[1]
                            abbr = homeTd.find_next('abbr')
                            game['homeTeam'] = TEAM_NAMES[abbr.string]
                            awayTd = tds[0]
                            abbr = awayTd.find_next('abbr')
                            game['awayTeam'] = TEAM_NAMES[abbr.string]
                            games.append(game)
        except Exception as e:
            pass
    return games


if __name__ == '__main__':
    allGames = getAllNFLGames()

    with open('conf/nflGames.json', 'w+') as outfile:
        json.dump(allGames, outfile)
