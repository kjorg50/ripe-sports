from __future__ import unicode_literals

from django.db import models

# Create your models here.
class Game(models.Model):
    league = models.CharField(max_length=200)
    homeTeam = models.CharField(max_length=200)
    awayTeam = models.CharField(max_length=200)
    date = models.CharField(max_length=200)
    year = models.IntegerField()
    class Meta:
        unique_together = ("homeTeam","awayTeam","date","year")