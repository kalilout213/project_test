from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Currency, Bank, BankAccount
from .serializers import CurrencySerializer, BankSerializer, BankAccountSerializer
from users.permissions import IsAdministrateurOrReadOnly, CanWrite


class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated, IsAdministrateurOrReadOnly]


class BankViewSet(viewsets.ModelViewSet):
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    permission_classes = [IsAuthenticated, IsAdministrateurOrReadOnly]
    search_fields = ['name', 'code', 'swift_code']
    filterset_fields = ['is_active', 'country']


class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.select_related('bank', 'currency').all()
    serializer_class = BankAccountSerializer
    permission_classes = [IsAuthenticated, CanWrite]
    search_fields = ['account_name', 'account_number', 'iban']
    filterset_fields = ['bank', 'currency', 'account_type', 'is_active']
