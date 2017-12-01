#!/usr/bin/env python

import requests
import json
import os

from bs4 import BeautifulSoup


def getAllNFLGames():
    games = []
    for week in range(1,13):
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
                            game['homeTeam'] = abbr.string
                            awayTd = tds[0]
                            abbr = awayTd.find_next('abbr')
                            game['awayTeam'] = abbr.string
                            games.append(game)
        except Exception as e:
            pass
    return games


if __name__ == '__main__':
    allGames = getAllNFLGames()

    with open('conf/nflGames.json', 'w+') as outfile:
        json.dump(allGames, outfile)
