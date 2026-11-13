from rest_framework import serializers
from .models import AccountingJournal, AccountingEntry, AccountingImport


class AccountingJournalSerializer(serializers.ModelSerializer):
    bank_account_name = serializers.CharField(source='bank_account.account_name', read_only=True)
    entries_count = serializers.SerializerMethodField()

    class Meta:
        model = AccountingJournal
        fields = '__all__'

    def get_entries_count(self, obj):
        return obj.entries.count()


class AccountingEntrySerializer(serializers.ModelSerializer):
    journal_code = serializers.CharField(source='journal.code', read_only=True)
    journal_name = serializers.CharField(source='journal.name', read_only=True)
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    transaction_type = serializers.CharField(read_only=True)

    class Meta:
        model = AccountingEntry
        fields = '__all__'


class AccountingImportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountingImport
        fields = '__all__'
