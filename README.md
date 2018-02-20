# ripe-sports
Sports highlights without spoilers

## Installation

First, make sure all `pip` packages are installed (a virtualenv can be used)

```pip install -r requirements.txt```

A one-time step is required to apply the database migrations

```python manage.py migrate```

Run the scraper to gather all game data (as often as needed). To load a smaller set of game data see the section on using scrapeSports.py below.

```python scrapeSports.py everything```

## Usage

Running local server:
1) navigate to RipeSports directory, which contains `manage.py`
2) run command `python manage.py runserver`
3) navigate to localhost:8000 on a browser

## MySQL Database
### Install 
This part is a bit hazy to me as its been a long time. Let me know if the following instructions don't work:

1) Start by installing MySQL Community server from the site: https://dev.mysql.com/downloads/mysql/
2) Add path to your .bash_profile: `export PATH=$PATH:/usr/local/mysql/bin`
3) Start the server with the command: `mysql.server start`. This is a step you'll have to do always before the database can be used. The server should stay up until your computer is restarted or you explicitly close it though.
4) Create a new admin user: `mysqladmin -u root&nbsp;password yourpassword` Note: I don't use a password for my mysql dev admin. If you use a password or make a user named other than `root` you'll need to modify the database credentials settings set in `settings.py` and at the top of `scrapeSports.py` 
5) Open mysql command line interface: `mysql -u root -p <password>` (or just `mysql -u root` if you set no password)
6) Create a copy of the ripesports database: `CREATE DATABASE ripesportsdb` (NOTE: changes to the database's name will require updating `settings.py` and `scrapeSports.py`)
7) Exit mysql CLI: `exit`
8) pip install dependencies:
    -`mysqlclient` : used by Django for mysql api
    -`pymysql` : used by sportsScraper.py to insert rows into the database outside of the django runtime environment
9) Set up database tables: `python manage.py makemigrations` followed by `python manage.py migrate`

### Nuking your database
I'm sure there are ways to avoid this. It's the database equivalent of deleting a git repository and recloning because you don't want to deal with merging conflicts lol. But because of the small size of our project it's often the easiest way:

1. Enter the Mysql command line tool by entering 'mysql -u root' in your command line (will be different if you used a password for your account)

2) now that you're in the mysql command line: `drop database ripesportsdb;` to delete the db

3) now recreate the database: `create database ripesportsdb`
4) `exit` to quit the mysql command line
5) now go to RipeSportsApp fodler, which should have a migrations folder within it
6) `rm 0*` to delete all migration files but keep the init file in there
7) with a clean database and no records of migrations, you can recreate your database according to your django model schema
8) `python manage.py makemigrations`
9) `python manage.py migrate`
10) good to go. rerun the scraper to reload the renewed database.

## Using scrapeSports.py
1) `python scrapeSports.py everything` : Download all MLB, NBA, NFL games since the year 2000 and insert them into the database (takes nearly an hour)
2) `python scrapeSports.py <league> <startYear> <endYear>` : Download games from specific period of time and for a specific league. Ex `python scrapeSports.py mlb 2017 2018` would download all mlb games from the year 2017 only.
3) Emptying the database: the `RipeSportsApp_game` table which holds all games is set up to prevent duplicate entries. If the scraper is run for the same period of time twice in a row it will cause many "duplicate insert" errors. (but in theory should still add the non-duplicate games into the db just fine). Regardless, to empty the database so it can be reloaded anew, run `python manage.py flush`. This will only clear the rows, not delete the tables or db.

## Debugging and Testing the Algorithm

###Debug Results
Uncomment the labeled commented section in `index.html`. The page will now have a "debug results" checkbox next to the go button. When it is checked and a highlight is requested, instead of loading the video found, the page will render the top 15 search results and details about them, including their original rank in the search results as well as their score given by the algorithm. This is useful when trying to see why a desired video did not make it to the top of the list and was used

###Test Alg
Uncomment the labeled commented section in `index.html`. The page will now have a "Test Alg" button next to the go button. When pressed, it will run the algorithm on all the games currently displayed on the page. For each, if the result returned outscores the corresponding `tryAgainScore` for that league, it is considered successful and if not, labeled as a failure. See the console for this output.


