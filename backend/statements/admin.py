from django.contrib import admin
from .models import BankStatement, BankTransaction


class BankTransactionInline(admin.TabularInline):
    model = BankTransaction
    extra = 0
    readonly_fields = ['transaction_date', 'description', 'amount', 'transaction_type', 'is_reconciled']


@admin.register(BankStatement)
class BankStatementAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'bank_account', 'file_format', 'status', 'transaction_count', 'imported_at']
    list_filter = ['file_format', 'status', 'bank_account__bank']
    inlines = [BankTransactionInline]


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_date', 'description', 'amount', 'transaction_type', 'is_reconciled']
    list_filter = ['transaction_type', 'is_reconciled']
    search_fields = ['description', 'reference']
