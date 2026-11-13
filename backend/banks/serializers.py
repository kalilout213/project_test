from rest_framework import serializers
from .models import Currency, Bank, BankAccount


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = '__all__'


class BankSerializer(serializers.ModelSerializer):
    accounts_count = serializers.SerializerMethodField()

    class Meta:
        model = Bank
        fields = '__all__'

    def get_accounts_count(self, obj):
        return obj.accounts.filter(is_active=True).count()


class BankAccountSerializer(serializers.ModelSerializer):
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    bank_code = serializers.CharField(source='bank.code', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)

    class Meta:
        model = BankAccount
        fields = '__all__'
