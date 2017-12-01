import requests
from bs4 import BeautifulSoup

def getAllNBAGames():
    games = []
    for year in range(2000,2018):
        for month in range(6,13):
            for day in range(1,32):
                try:
                    url = "http://www.espn.com/nba/schedule/_/date/"+str(year)+str(month)+str(day)
                    html = requests.get(url)
                    soup = BeautifulSoup(html.text, 'html.parser')
                    for table in soup.find_all('table'):
                        if table.get('class')==["schedule","has-team-logos","align-left"]:
                            for tr in table.find_all('tr'):
                                print "tr: ",tr
                                game = {
                                    'awayTeam':tr.find_all('td')[0],
                                    'homeTeam':tr.find_all('td')[1]
                            }
                            print game
                            games.append(game)
                    return games
                except:
                    print "skipping {} {} {}".format(year,month,day)
print getAllNBAGames()