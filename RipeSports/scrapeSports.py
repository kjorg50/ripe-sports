#!/usr/bin/env python
import requests
import json
import os, pprint, sys
from bs4 import BeautifulSoup
import pymysql.cursors
import pymysql

HOST = 'localhost'
DATABASE = 'ripesportsdb'
USER = 'root'
PASSWORD =''

scraperSettings = {
    'nba':{
        'url':"http://www.espn.com/nba/schedule/_/date/",
        'datesPerPage':7
    },
    'mlb':{
        'url':"http://www.espn.com/mlb/schedule/_/date/",
        'datesPerPage':3
    }
}

def insertGames(games):
    query = "INSERT INTO `RipeSportsApp_game` (`homeTeam`,`awayTeam`,`league`,`date`,`year`) \
             VALUES(%s,%s,%s,%s,%s)"
    conn = pymysql.connect(host=HOST,
                           database=DATABASE,
                           user=USER,
                           password=PASSWORD,
                           charset='utf8mb4',
                           cursorclass=pymysql.cursors.DictCursor)
    cursor = conn.cursor()
    cursor.executemany(query, games)
    conn.commit()
    conn.close()

def scrapeDailyLeagueGames(league,startYear,endYear):
    games = []
    scrapeConf = scraperSettings[league]  
    for year in range(startYear, endYear):
        for month in range(1,13):
            for day in range(1, 32, scrapeConf["datesPerPage"]):
                print "Scraping: ",league,year,month,day
                try:
                    strMonth = str(month) if month >= 10 else "0"+str(month)
                    strDay = str(day) if day >= 10 else "0"+str(day)
                    url = scrapeConf['url']+str(year)+strMonth+strDay
                    html = requests.get(url)
                    soup = BeautifulSoup(html.text, 'html.parser')
                    for table in soup.find_all('table'):
                        if table.get('class')==["schedule","has-team-logos","align-left"]:
                            date = table.find_previous("h2").string
                            for tbody in table.find_all('tbody'):
                                for tr in tbody.find_all('tr'):
                                    game = (league,date,year)
                                    tds = tr.find_all('td')
                                    homeTd = tds[1]
                                    abbr = homeTd.find_next('abbr')
                                    game = (abbr['title'],) + game
                                    awayTd = tds[0]
                                    abbr = awayTd.find_next('abbr')
                                    game = (abbr['title'],) + game
                                    games.append(game)
                except Exception as e:
                    print "No game scraped"
                    pass
    #use sets to elimate duplicates! fuck yeah SETS
    return list(set(games))

#TODO: playoffs/championships/summer league
def scrapeNFLGames(startYear,endYear):
    games = []
    for year in range(startYear, endYear):
        for week in range(1,18):
            print "Scraping NFL games for",year," week ", week
            try:
                url = "http://www.espn.com/nfl/schedule/_/week/"+str(week)+"/year/"+str(year)
                html = requests.get(url)
                soup = BeautifulSoup(html.text, 'html.parser')
                for table in soup.find_all('table'):
                    if table.get('class') == ["schedule", "has-team-logos", "align-left"]:
                        for tbody in table.find_all('tbody'):
                            for tr in tbody.find_all('tr'):
                                game = ("nfl",week,year)
                                tds = tr.find_all('td')
                                homeTd = tds[1]
                                abbr = homeTd.find_next('abbr')
                                game = (abbr['title'],) + game
                                awayTd = tds[0]
                                abbr = awayTd.find_next('abbr')
                                game = (abbr['title'],) + game
                                games.append(game)
            except Exception as e:
                print "No game scraped"
                pass
    return list(set(games))

#Usage: python scrapeSports <league> <startyear> <endyear>
if __name__ == '__main__':
    if sys.argv[1] == 'everything':
        nflGames = scrapeNFLGames(2000,2018)
        mlbGames = scrapeDailyLeagueGames("mlb",2000,2018)
        nbaGames = scrapeDailyLeagueGames("nba",2000,2018)
        games = nflGames+mlbGames+nbaGames
    elif sys.argv[1] == 'nfl':
        games = scrapeNFLGames(int(sys.argv[2]),int(sys.argv[3]))
    else:
        games = scrapeDailyLeagueGames(scraperSettings[sys.argv[1]],int(sys.argv[2]),int(sys.argv[3]))
    insertGames(games)

