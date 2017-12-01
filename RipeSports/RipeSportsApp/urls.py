from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^getnflgames/',views.getNFLGames),
    url(r'^getnbagames/',views.getNBAGames)

]