from rest_framework import serializers
from .models import BankStatement, BankTransaction


class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = '__all__'


class BankStatementSerializer(serializers.ModelSerializer):
    bank_account_name = serializers.CharField(source='bank_account.account_name', read_only=True)
    bank_name = serializers.CharField(source='bank_account.bank.name', read_only=True)
    imported_by_name = serializers.CharField(source='imported_by.full_name', read_only=True)

    class Meta:
        model = BankStatement
        fields = '__all__'
