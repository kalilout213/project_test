from django.contrib import admin
from .models import AccountingJournal, AccountingEntry, AccountingImport


@admin.register(AccountingJournal)
class AccountingJournalAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'journal_type', 'bank_account', 'is_active']
    list_filter = ['journal_type', 'is_active']


@admin.register(AccountingEntry)
class AccountingEntryAdmin(admin.ModelAdmin):
    list_display = ['entry_date', 'piece_number', 'account_code', 'description', 'debit', 'credit', 'is_reconciled']
    list_filter = ['journal', 'is_reconciled']
    search_fields = ['description', 'reference', 'account_code', 'piece_number']
    date_hierarchy = 'entry_date'
