from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CurrencyViewSet, BankViewSet, BankAccountViewSet

router = DefaultRouter()
router.register('currencies', CurrencyViewSet, basename='currency')
router.register('accounts', BankAccountViewSet, basename='bankaccount')
router.register('', BankViewSet, basename='bank')

urlpatterns = [path('', include(router.urls))]
