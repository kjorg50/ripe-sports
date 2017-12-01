# ripe-sports
Sports highlights without spoilers

## Installation

First, make sure `django` is installed (a virtualenv can be used)

```pip install django```

A one-time step is required to apply the database migrations

```python manage.py migrate```

## Usage

Running local server:
1) navigate to RipeSports directory, which contains `manage.py`
2) run command `python manage.py runserver`
3) navigate to localhost:8000 on a browser
