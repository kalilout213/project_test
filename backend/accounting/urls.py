from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccountingJournalViewSet, AccountingEntryViewSet

router = DefaultRouter()
router.register('journals', AccountingJournalViewSet, basename='journal')
router.register('entries', AccountingEntryViewSet, basename='entry')

urlpatterns = [path('', include(router.urls))]
