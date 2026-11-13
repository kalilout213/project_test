from django.contrib import admin
from .models import Currency, Bank, BankAccount


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'symbol']


@admin.register(Bank)
class BankAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'country', 'swift_code', 'is_active']
    list_filter = ['is_active', 'country']
    search_fields = ['name', 'code']


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ['account_name', 'account_number', 'bank', 'currency', 'account_type', 'is_active']
    list_filter = ['bank', 'currency', 'account_type', 'is_active']
    search_fields = ['account_name', 'account_number']
