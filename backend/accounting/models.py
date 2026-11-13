from django.db import models
from django.conf import settings
from banks.models import BankAccount


class JournalType(models.TextChoices):
    BANQUE = 'BANQUE', 'Journal de Banque'
    VENTES = 'VENTES', 'Journal des Ventes'
    ACHATS = 'ACHATS', 'Journal des Achats'
    CAISSE = 'CAISSE', 'Journal de Caisse'
    OD = 'OD', 'Opérations Diverses'
    PAIE = 'PAIE', 'Journal de Paie'


class AccountingJournal(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    journal_type = models.CharField(max_length=10, choices=JournalType.choices)
    bank_account = models.ForeignKey(
        BankAccount, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='journals', help_text='Compte bancaire associé (pour les journaux banque)'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Journal comptable'
        verbose_name_plural = 'Journaux comptables'
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class AccountingEntry(models.Model):
    journal = models.ForeignKey(AccountingJournal, on_delete=models.PROTECT, related_name='entries')
    entry_date = models.DateField()
    piece_number = models.CharField(max_length=50, blank=True)
    account_code = models.CharField(max_length=20)
    account_label = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    reference = models.CharField(max_length=255, blank=True)
    debit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    is_reconciled = models.BooleanField(default=False)
    reconciliation_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Écriture comptable'
        verbose_name_plural = 'Écritures comptables'
        ordering = ['-entry_date', 'piece_number']
        indexes = [
            models.Index(fields=['entry_date']),
            models.Index(fields=['account_code']),
            models.Index(fields=['is_reconciled']),
        ]

    def __str__(self):
        return f'{self.entry_date} | {self.piece_number} | {self.description[:50]}'

    @property
    def amount(self):
        return self.debit if self.debit > 0 else self.credit

    @property
    def transaction_type(self):
        return 'DEBIT' if self.debit > 0 else 'CREDIT'


class AccountingImport(models.Model):
    journal = models.ForeignKey(AccountingJournal, on_delete=models.PROTECT)
    file_name = models.CharField(max_length=255)
    imported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    imported_at = models.DateTimeField(auto_now_add=True)
    entry_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='COMPLETED')
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-imported_at']
