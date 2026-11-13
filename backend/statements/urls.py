from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BankStatementViewSet, BankTransactionViewSet

router = DefaultRouter()
router.register('transactions', BankTransactionViewSet, basename='transaction')
router.register('', BankStatementViewSet, basename='statement')

urlpatterns = [path('', include(router.urls))]
