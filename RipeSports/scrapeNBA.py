#!/usr/bin/env python

import requests
import json
import os

from bs4 import BeautifulSoup


def getAllNBAGames():
    games = []
    for year in range(2000, 2018):
        for month in range(6, 13):
            for day in range(1, 32, 7):
                try:
                    url = "http://www.espn.com/nba/schedule/_/date/"+str(year)+str(month)+(str(day) if day >= 10 else "0"+str(day))
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
                                    game['homeTeam'] = abbr.string
                                    awayTd = tds[0]
                                    abbr = awayTd.find_next('abbr')
                                    game['awayTeam'] = abbr.string
                                    games.append(game)
                except Exception as e:
                    pass
    return games


if __name__ == '__main__':
    allGames = getAllNBAGames()
    with open('conf/nbaGames.json', 'w+') as outfile:
        json.dump(allGames, outfile)
