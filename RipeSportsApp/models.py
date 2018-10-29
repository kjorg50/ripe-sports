from __future__ import unicode_literals

from django.db import models

# Create your models here.
class Game(models.Model):
    league = models.CharField(max_length=200)
    homeTeam = models.CharField(max_length=200)
    awayTeam = models.CharField(max_length=200)
    prettyDate = models.CharField(max_length=200)
    date = models.DateField()
    class Meta:
        unique_together = ("league","homeTeam","awayTeam","date")

class Timer(models.Model):
    user_id = models.CharField(max_length=200)
    channel_id = models.CharField(max_length=200)
    start_time = models.DateTimeField('start time')


class LogEntry(models.Model):
    user_id = models.CharField(max_length=200)
    channel_id = models.CharField(max_length=200)
    description = models.TextField(max_length=200)
    start_time = models.DateTimeField('start time')
    end_time = models.DateTimeField('end time')
    def __repr__(self):
        duration = self.end_time - self.start_time
        #remove microseconds
        pretty = str(duration).split('.')[0]
        return '{pretty: <9} | {desc}\n'.format(pretty=pretty,desc=self.description)