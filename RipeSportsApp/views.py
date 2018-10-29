import calendar
from datetime import date, datetime, timedelta
import json
from models import *
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from pprint import pprint
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.csrf import csrf_exempt




def index(request):
    return render(request,'RipeSportsApp/index.html');# Create your views here.

def getGamesByDate(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        #Post request holds date for which the games are wanted
        league = postData.get("league")
        date = postData.get("date")
        games = list(Game.objects.filter(date=date,league=league).values('homeTeam', 'awayTeam','prettyDate','date'))
        #Special django serializer needed for serializing objects
        return HttpResponse(json.dumps(games, cls=DjangoJSONEncoder),content_type='application/json')

def getGamesByWeek(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        #Post request holds week and year for which the games are wanted
        league = postData.get("league")
        year = postData.get("year")
        week = postData.get("week")
        games = list(Game.objects.filter(prettyDate=week,league=league,date__year=year).values('homeTeam', 'awayTeam','prettyDate','date'))
        #Special django serializer needed for serializing objects
        return HttpResponse(json.dumps(games, cls=DjangoJSONEncoder),content_type='application/json')


def getRecentGames(request):
    if request.method=="POST":
        postData = json.loads(request.body)
        league = postData.get("league")
        numGames = postData.get("numGames")
        today = date.today()
        #get last <numGames> games played
        games = list(Game.objects.filter(league=league, date__lt=today).order_by('-date').values('homeTeam', 'awayTeam', 'prettyDate','date')[:numGames])
        #Special django serializer needed for serializing objects
        return HttpResponse(json.dumps(games, cls=DjangoJSONEncoder),content_type='application/json')

#The following are for a coding challenge, unrelated to ripesports and will be removed in a few weeks
@csrf_exempt
def timer(request):
    if request.method == 'POST':
        cmd = request.POST.get('text')
        if cmd is not None:
            if cmd == 'start':
                #if timer exists, update it
                try:
                    timer = Timer.objects.get(user_id=request.POST['user_id'],channel_id=request.POST['channel_id'])
                    timer.start_time = datetime.now()
                except Timer.DoesNotExist:
                    #else create new one
                    timer = Timer(user_id=request.POST['user_id'],channel_id=request.POST['channel_id'],start_time=datetime.now())
                    timer.save()
                return HttpResponse('Started Timer')
            elif cmd == 'check':
                try:
                    timer = Timer.objects.get(user_id=request.POST['user_id'],channel_id=request.POST['channel_id'])
                except Timer.DoesNotExist:
                    return HttpResponse('There is no timer running. Try `/timer start`')
                naive = timer.start_time.replace(tzinfo=None)
                elapsed = datetime.now()-naive
                response = {
                                'response_type':'ephemereal',
                                'text': 'Checking Timer',
                                'attachments':[
                                    {
                                        'text':'Elapsed Time: '+str(elapsed)
                                    }
                                ]
                            }
                return JsonResponse(response)
            elif cmd == 'stop':
                try:
                    timer = Timer.objects.get(user_id=request.POST['user_id'],channel_id=request.POST['channel_id'])
                except Timer.DoesNotExist:
                    return HttpResponse('There is no timer running. Try `/timer start`')
                naive = timer.start_time.replace(tzinfo=None)
                elapsed = datetime.now()-naive
                timer.delete()
                response = {
                                'response_type':'ephemereal',
                                'text': 'Stopping Timer',
                                'attachments':[
                                    {
                                        'text':'Elapsed Time: '+str(elapsed)
                                    }
                                ]
                            }
                return JsonResponse(response)
        return HttpResponse('Invalid Timer Command')

@csrf_exempt
def log(request):
    if request.method == 'POST':
        entry = request.POST.get('text')
        if entry is not None:
            #get timer
            try:
                timer = Timer.objects.get(user_id=request.POST['user_id'],
                                          channel_id=request.POST['channel_id'])
            except Timer.DoesNotExist:
                return HttpResponse('There is no timer running. Try `/timer start`')
            billing_start_time = timer.start_time
            #get last log entry
            log_entries = list(LogEntry.objects.filter(user_id=request.POST['user_id'],
                                                channel_id=request.POST['channel_id'],
                                                start_time__gte=billing_start_time).order_by('-end_time'))
            #start time is end time of last log entry
            if len(log_entries) > 0:
                start_time = log_entries[0].end_time
            #if this is the first log entry, start time is timer start time
            else:
                start_time = billing_start_time
            end_time = datetime.now()
            #create log entry
            log_entry = LogEntry(user_id=request.POST['user_id'],
                                 channel_id=request.POST['channel_id'],
                                 description=entry,
                                 start_time=start_time,
                                 end_time=end_time)
            log_entry.save()
            naive = timer.start_time.replace(tzinfo=None)
            elapsed = end_time-naive
            response = {
                            'response_type':'ephemereal',
                            'text': 'Added Log Entry',
                            'attachments':[
                                {
                                    'text':'Added Log Entry: '+str(entry)+'\nElapsed Time: '+str(elapsed)+'\n'
                                }
                            ]
                        }
            return JsonResponse(response)
        return HttpResponse('Invalid Log Command')

@csrf_exempt
def closelog(request):
    if request.method == 'POST':
        #get timer
        try:
            timer = Timer.objects.get(user_id=request.POST['user_id'],
                                      channel_id=request.POST['channel_id'])
        except Timer.DoesNotExist:
            return HttpResponse('There is no timer running. Try `/timer start`')
        #get log entries for this timer
        log_entries = list(LogEntry.objects.filter(user_id=request.POST['user_id'],
                                                   channel_id=request.POST['channel_id'],
                                                   start_time__gte=timer.start_time).order_by('start_time'))
        if len(log_entries) == 0:
            return HttpResponse('No logs recorded. Timer still running')
        log = 'Duration | Description\n'
        for entry in log_entries:
            log += repr(entry)
        total_time = log_entries[-1].end_time - timer.start_time
        log += 'Total Time: '+str(total_time)
        response = {
                        'response_type':'in_channel',
                        'text': 'Closed Log',
                        'attachments':[
                            {
                                'text':log
                            }
                        ]
                    }
        #delete timer
        timer.delete()
        return JsonResponse(response)
