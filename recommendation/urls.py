from django.urls import path
from django.views.generic import TemplateView
from . import views

urlpatterns = [
    path('preferences/', views.user_preferences, name='user_preferences'),
    path('behavior/', views.record_user_behavior, name='record_user_behavior'),
    path('hospitals/', views.recommend_hospitals, name='recommend_hospitals'),
    path('doctors/', views.recommend_doctors, name='recommend_doctors'),
    path('feedback/', views.submit_feedback, name='recommendation_feedback'),
    path('popular/', views.get_popular_items, name='popular_items'),
    path('history/', views.get_recommendation_history, name='recommendation_history'),
    path('profile/<int:user_id>/', views.get_user_profile, name='user_profile'),
    path('test/', TemplateView.as_view(template_name='recommendation/test_dashboard.html'), name='test_dashboard'),
]