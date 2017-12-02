#!/usr/bin/env python

import requests
import json
import os

from bs4 import BeautifulSoup

TEAM_NAMES = {
    "ATL": "Atlanta Hawks",
    "BKN": "Brooklyn Nets",
    "BOS": "Boston Celtics",
    "CHA": "Charlotte Bobcats",
    "CHI": "Chicago Bulls",
    "CLE": "Cleveland Cavaliers",
    "DAL": "Dallas Mavericks",
    "DEN": "Denver Nuggets",
    "DET": "Detroit Pistons",
    "GSW": "Golden State Warriors",
    "HOU": "Houston Rockets",
    "IND": "Indianapolis Pacers",
    "LAC": "Los Angeles Clippers",
    "LAL": "Los Angeles Lakers",
    "MEM": "Memphis Grizzlies",
    "MIA": "Miami Heat",
    "MIL": "Milwaukee Bucks",
    "MIN": "Minnesota Timberwolves",
    "NO": "New Orleans Pelicans",
    "NOP": "New Orleans Pelicans",
    "NYK": "New York Knicks",
    "OKC": "Oklahoma City Thunder",
    "ORL": "Orlando Magic",
    "PHI": "Philadelphia 76ers",
    "PHX": "Phoenix Suns",
    "POR": "Portland Trailblazers",
    "SAC": "Sacramento Kings",
    "SAS": "San Antonio Spurs",
    "TOR": "Toronto Raptors",
    "UTA": "Utah Jazz",
    "UTAH": "Utah Jazz",
    "WAS": "Washington Wizards"
}

def getAllNBAGames():
    games = []
    for year in range(2000, 2018):
        for month in range(6, 13):
            for day in range(1, 32, 7):
                try:
                    strMonth = str(month) if month >= 10 else "0"+str(month)
                    strDay = str(day) if day >= 10 else "0"+str(day)
                    url = "http://www.espn.com/nba/schedule/_/date/"+str(year)+strMonth+strDay
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
                                    game['homeTeam'] = TEAM_NAMES[abbr.string]
                                    awayTd = tds[0]
                                    abbr = awayTd.find_next('abbr')
                                    game['awayTeam'] = TEAM_NAMES[abbr.string]
                                    games.append(game)
                except Exception as e:
                    pass
    return games


if __name__ == '__main__':
    allGames = getAllNBAGames()
    with open('conf/nbaGames.json', 'w+') as outfile:
        json.dump(allGames, outfile)
