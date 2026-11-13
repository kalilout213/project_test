from rest_framework import serializers
from .models import ReconciliationSession, ReconciliationMatch, ReconciliationGap
from statements.serializers import BankTransactionSerializer
from accounting.serializers import AccountingEntrySerializer


class ReconciliationSessionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    validated_by_name = serializers.CharField(source='validated_by.full_name', read_only=True)
    bank_account_name = serializers.CharField(source='bank_account.account_name', read_only=True)
    bank_name = serializers.CharField(source='bank_account.bank.name', read_only=True)
    journal_name = serializers.CharField(source='journal.name', read_only=True)
    match_count = serializers.IntegerField(read_only=True)
    gap_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ReconciliationSession
        fields = '__all__'
        read_only_fields = ['created_by', 'validated_by', 'validated_at']


class ReconciliationMatchSerializer(serializers.ModelSerializer):
    bank_transaction_data = BankTransactionSerializer(source='bank_transaction', read_only=True)
    accounting_entry_data = AccountingEntrySerializer(source='accounting_entry', read_only=True)
    matched_by_name = serializers.CharField(source='matched_by.full_name', read_only=True)

    class Meta:
        model = ReconciliationMatch
        fields = '__all__'


class ReconciliationGapSerializer(serializers.ModelSerializer):
    bank_transaction_data = BankTransactionSerializer(source='bank_transaction', read_only=True)
    accounting_entry_data = AccountingEntrySerializer(source='accounting_entry', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True)

    class Meta:
        model = ReconciliationGap
        fields = '__all__'
