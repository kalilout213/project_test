from django.db import models
from django.conf import settings
from banks.models import BankAccount
from statements.models import BankTransaction
from accounting.models import AccountingEntry, AccountingJournal


class SessionStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Brouillon'
    IN_PROGRESS = 'IN_PROGRESS', 'En cours'
    COMPLETED = 'COMPLETED', 'Complété'
    VALIDATED = 'VALIDATED', 'Validé'


class ReconciliationSession(models.Model):
    name = models.CharField(max_length=200)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='reconciliation_sessions')
    journal = models.ForeignKey(AccountingJournal, on_delete=models.PROTECT, related_name='reconciliation_sessions')
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=15, choices=SessionStatus.choices, default=SessionStatus.DRAFT)
    auto_match_threshold = models.IntegerField(default=80, help_text='Score minimum pour rapprochement automatique (0-200)')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_sessions')
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='validated_sessions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Session de rapprochement'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.period_start} → {self.period_end})'

    @property
    def match_count(self):
        return self.matches.count()

    @property
    def gap_count(self):
        return self.gaps.filter(status='OUVERT').count()


class ReconciliationMatch(models.Model):
    session = models.ForeignKey(ReconciliationSession, on_delete=models.CASCADE, related_name='matches')
    bank_transaction = models.ForeignKey(BankTransaction, on_delete=models.PROTECT)
    accounting_entry = models.ForeignKey(AccountingEntry, on_delete=models.PROTECT)
    score = models.IntegerField(default=0)
    is_manual = models.BooleanField(default=False)
    matched_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    matched_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Rapprochement'
        unique_together = [
            ['session', 'bank_transaction'],
            ['session', 'accounting_entry'],
        ]
        ordering = ['-score', '-matched_at']


class GapType(models.TextChoices):
    BANQUE_SANS_COMPTA = 'BANQUE_SANS_COMPTA', 'Banque sans écriture comptable'
    COMPTA_SANS_BANQUE = 'COMPTA_SANS_BANQUE', 'Écriture comptable sans transaction bancaire'
    MONTANT_DIFFERENT = 'MONTANT_DIFFERENT', 'Montants différents'
    DATE_DIFFERENTE = 'DATE_DIFFERENTE', 'Dates différentes'


class GapStatus(models.TextChoices):
    OUVERT = 'OUVERT', 'Ouvert'
    EXPLIQUE = 'EXPLIQUE', 'Expliqué'
    RESOLU = 'RESOLU', 'Résolu'


class ReconciliationGap(models.Model):
    session = models.ForeignKey(ReconciliationSession, on_delete=models.CASCADE, related_name='gaps')
    gap_type = models.CharField(max_length=25, choices=GapType.choices)
    status = models.CharField(max_length=10, choices=GapStatus.choices, default=GapStatus.OUVERT)
    bank_transaction = models.ForeignKey(BankTransaction, on_delete=models.SET_NULL, null=True, blank=True)
    accounting_entry = models.ForeignKey(AccountingEntry, on_delete=models.SET_NULL, null=True, blank=True)
    amount_difference = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    justification = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Écart de rapprochement'
        ordering = ['-created_at']
