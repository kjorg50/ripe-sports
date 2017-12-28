from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^gamesByDate/',views.getGamesByDate),
    url(r'^gamesByWeek/',views.getGamesByWeek),
    url(r'^recentgames/',views.getRecentGames)

]