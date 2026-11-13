from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReconciliationSessionViewSet, ReconciliationMatchViewSet, ReconciliationGapViewSet

router = DefaultRouter()
router.register('sessions', ReconciliationSessionViewSet, basename='session')
router.register('matches', ReconciliationMatchViewSet, basename='match')
router.register('gaps', ReconciliationGapViewSet, basename='gap')

urlpatterns = [path('', include(router.urls))]
