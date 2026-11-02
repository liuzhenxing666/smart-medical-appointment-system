from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.ReviewStatsView.as_view(), name='review-stats'),
]