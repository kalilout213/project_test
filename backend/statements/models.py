from django.db import models
from django.conf import settings
from banks.models import BankAccount


class FileFormat(models.TextChoices):
    CSV = 'CSV', 'CSV'
    EXCEL = 'EXCEL', 'Excel'
    MT940 = 'MT940', 'MT940 (SWIFT)'
    CAMT053 = 'CAMT053', 'CAMT.053 (ISO 20022)'


class StatementStatus(models.TextChoices):
    PENDING = 'PENDING', 'En attente'
    PROCESSING = 'PROCESSING', 'En cours'
    COMPLETED = 'COMPLETED', 'Importé'
    ERROR = 'ERROR', 'Erreur'


class BankStatement(models.Model):
    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='statements')
    file_name = models.CharField(max_length=255)
    file_format = models.CharField(max_length=10, choices=FileFormat.choices)
    status = models.CharField(max_length=15, choices=StatementStatus.choices, default=StatementStatus.PENDING)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    transaction_count = models.IntegerField(default=0)
    total_debit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    imported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='imported_statements'
    )
    imported_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Relevé bancaire'
        verbose_name_plural = 'Relevés bancaires'
        ordering = ['-imported_at']

    def __str__(self):
        return f'{self.bank_account} - {self.file_name}'


class TransactionType(models.TextChoices):
    DEBIT = 'DEBIT', 'Débit'
    CREDIT = 'CREDIT', 'Crédit'


class BankTransaction(models.Model):
    statement = models.ForeignKey(BankStatement, on_delete=models.CASCADE, related_name='transactions')
    transaction_date = models.DateField()
    value_date = models.DateField(null=True, blank=True)
    description = models.TextField()
    reference = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    transaction_type = models.CharField(max_length=6, choices=TransactionType.choices)
    balance_after = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    is_reconciled = models.BooleanField(default=False)
    reconciliation_id = models.IntegerField(null=True, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Transaction bancaire'
        verbose_name_plural = 'Transactions bancaires'
        ordering = ['-transaction_date', 'id']
        indexes = [
            models.Index(fields=['transaction_date']),
            models.Index(fields=['is_reconciled']),
            models.Index(fields=['reference']),
        ]

    def __str__(self):
        return f'{self.transaction_date} | {self.description[:50]} | {self.amount}'
