#!/usr/bin/env python
import requests
import json
import os, pprint, sys
from bs4 import BeautifulSoup
import pymysql.cursors
import pymysql
import datetime


if os.environ.get('DJANGO_DEVELOPMENT') is not None:
    HOST = 'localhost'
    DATABASE = 'ripesportsdb'
    USER = 'root'
    PASSWORD =''
else:
    HOST='ripesportsadmin.ripesports.com'
    DATABASE = 'ripesportsdb'
    USER = 'ripesports_adm'
    PASSWORD = os.environ.get('RIPESPORTS_DB_PASSWORD')

    
scraperSettings = {
    'nba':{
        'league':'nba',
        'url':"http://www.espn.com/nba/schedule/_/date/",
        'datesPerPage':7
    },
    'mlb':{
        'league':'mlb',
        'url':"http://www.espn.com/mlb/schedule/_/date/",
        'datesPerPage':3
    }
}

def insertGames(games):
    query = "INSERT INTO `RipeSportsApp_game` (`homeTeam`,`awayTeam`,`league`,`prettyDate`,`date`) \
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

def parseDate(prettyDate, year, league):
    #expects input in format "<weekday>, <month-word> <day>" outputs in Y-m-d format. Example: "Saturday, December 30" -> 2017-12-30
    months = ["January","February","March","April","May","June","July","August","September","October","November","December"] 
    pDateParts = prettyDate.split(' ')
    month = months.index(pDateParts[1])+1
    day = int(pDateParts[-1])
    if league == "nfl" and month < 5: #since postseason happens in the early months of the next year
        year += 1
    return datetime.date(year,month,day)

def testScrape():
    games = []
    html = requests.get("http://www.espn.com/nfl/schedule/_/year/2017")
    soup = BeautifulSoup(html.text, 'html.parser')
    for table in soup.find_all('table'):
        if table.get('class')==["schedule","has-team-logos","align-left"]:
            prettyDate = table.find_previous("h2").string #"Saturday, December 23"
            actualDate = parseDate(prettyDate,2017,'nfl') #"12/23/2017"
            for tbody in table.find_all('tbody'):
                for tr in tbody.find_all('tr'):
                    tds = tr.find_all('td')
                    if len(tds) > 3:
                        game = ['nfl',prettyDate,actualDate]
                        homeTd = tds[1]
                        abbr = homeTd.find_next('abbr')
                        game = [abbr['title']] + game
                        awayTd = tds[0]
                        abbr = awayTd.find_next('abbr')
                        game = [abbr['title']] + game
                        games.append(game)
    pprint.pprint(games)
    return games

def scrapeESPNPage(league,year,url):
    print "Scraping: ",url
    games = []
    try:
        html = requests.get(url)
        soup = BeautifulSoup(html.text, 'html.parser')
        for table in soup.find_all('table'):
            if table.get('class')==["schedule","has-team-logos","align-left"]:
                prettyDate = table.find_previous("h2").string #"Saturday, December 23"
                actualDate = parseDate(prettyDate,year,league) #"12/23/2017"
                for tbody in table.find_all('tbody'):
                    for tr in tbody.find_all('tr'):
                        tds = tr.find_all('td')
                        if len(tds) > 3:
                            game = [league,prettyDate,actualDate]
                            homeTd = tds[1]
                            abbr = homeTd.find_next('abbr')
                            game = [abbr['title']] + game
                            awayTd = tds[0]
                            abbr = awayTd.find_next('abbr')
                            game = [abbr['title']] + game
                            games.append(game)
        return games
    except Exception as e:
        print e
        print "No games scraped"

def getDailyLeagueGames(league,startYear,endYear):
    scrapeConf = scraperSettings[league]
    games = []
    for year in range(startYear, endYear):
        for month in range(1,13):
            for day in range(1, 32, scrapeConf["datesPerPage"]):
                strMonth = str(month) if month >= 10 else "0"+str(month)
                strDay = str(day) if day >= 10 else "0"+str(day)
                url = scrapeConf['url']+str(year)+strMonth+strDay
                scrapedGames = scrapeESPNPage(scrapeConf['league'],year,url)
                games += scrapedGames if scrapedGames != None else []
    #convert array of arrays into array of tuples
    games = [tuple(game) for game in games]
    #use sets to elimate duplicates! fuck yeah SETS
    return list(set(games))

#TODO: playoffs/championships/summer league
def getNFLGames(startYear,endYear):
    games = []
    for year in range(startYear, endYear):
        #get preseason games
        preseasonUrls = [ "http://www.espn.com/nfl/schedule/_/week/"+str(i)+"/year/"+str(year)+"/seasontype/1" for i in range(2,5) ] + \
                        [ "http://www.espn.com/nfl/schedule/_/year/"+str(year)+"/seasontype/1" ] #preseason week 4 is special
        for j,url in enumerate(preseasonUrls):
            scrapedGames = scrapeESPNPage('nfl',year,url)
            if scrapedGames != None:
                #change pretty dates
                for game in scrapedGames:
                    game[3] = "Preseason Week " + str(j)
                games += scrapedGames

        #get regular season games
        for week in range(1,18):
            url = "http://www.espn.com/nfl/schedule/_/week/"+str(week)+"/year/"+str(year)+"/seasontype/2"
            scrapedGames = scrapeESPNPage('nfl',year,url)
            if scrapedGames != None:
                #change pretty dates
                for game in scrapedGames:
                    game[3] = "Week " + str(week)
                games += scrapedGames

        #get postseason games
        #wildcard round
        url = "http://www.espn.com/nfl/schedule/_/week/1/year/"+str(year)
        scrapedGames = scrapeESPNPage('nfl',year,url)
        if scrapedGames != None:
            for game in scrapedGames:
                game[3] = "Wild Card"
            games += scrapedGames
        #divisional playoff
        url = "http://www.espn.com/nfl/schedule/_/week/2/year/"+str(year)
        scrapedGames = scrapeESPNPage('nfl',year,url)
        if scrapedGames != None:
            for game in scrapedGames:
                game[3] = "Divisional Round"
            games += scrapedGames
        #Conference championships
        url = "http://www.espn.com/nfl/schedule/_/week/3/year/"+str(year)
        scrapedGames = scrapeESPNPage('nfl',year,url)
        if scrapedGames != None:
            for game in scrapedGames:
                game[3] = "Conference Championships"
            games += scrapedGames
        #Pro bowl
        url = "http://www.espn.com/nfl/schedule/_/week/4/year/"+str(year)
        scrapedGames = scrapeESPNPage('nfl',year,url)
        if scrapedGames != None:
            for game in scrapedGames:
                game[3] = "Pro Bowl"
            games += scrapedGames
        #super bowl
        url = "http://www.espn.com/nfl/schedule/_/year/"+str(year)
        scrapedGames = scrapeESPNPage('nfl',year,url)
        if scrapedGames != None:
            #change pretty dates
            for game in scrapedGames:
                game[3] = "Super Bowl"
            games += scrapedGames
    #convert array of arrays into array of tuples
    games = [tuple(game) for game in games]
    return list(set(games))

#Usage: python scrapeSports <league> <startyear> <endyear>
if __name__ == '__main__':
    if sys.argv[1] == 'everything':
        nflGames = getNFLGames(2000,2018)
        mlbGames = getDailyLeagueGames("mlb",2000,2018)
        nbaGames = getDailyLeagueGames("nba",2000,2018)
        games = nflGames+mlbGames+nbaGames
    elif sys.argv[1] == 'nfl':
        games = getNFLGames(int(sys.argv[2]),int(sys.argv[3]))
    else:
        games = getDailyLeagueGames(sys.argv[1],int(sys.argv[2]),int(sys.argv[3]))
    insertGames(games)

