from django.contrib import admin
from .models import ReconciliationSession, ReconciliationMatch, ReconciliationGap


@admin.register(ReconciliationSession)
class ReconciliationSessionAdmin(admin.ModelAdmin):
    list_display = ['name', 'bank_account', 'journal', 'period_start', 'period_end', 'status', 'created_by']
    list_filter = ['status', 'bank_account__bank']
    search_fields = ['name']


@admin.register(ReconciliationMatch)
class ReconciliationMatchAdmin(admin.ModelAdmin):
    list_display = ['session', 'bank_transaction', 'accounting_entry', 'score', 'is_manual', 'matched_at']
    list_filter = ['session', 'is_manual']


@admin.register(ReconciliationGap)
class ReconciliationGapAdmin(admin.ModelAdmin):
    list_display = ['session', 'gap_type', 'status', 'amount_difference']
    list_filter = ['gap_type', 'status']
