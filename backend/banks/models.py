from django.db import models


class Currency(models.Model):
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=100)
    symbol = models.CharField(max_length=10)

    class Meta:
        verbose_name = 'Devise'
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class Bank(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    country = models.CharField(max_length=100, default="Côte d'Ivoire")
    swift_code = models.CharField(max_length=11, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Banque'
        ordering = ['name']

    def __str__(self):
        return f'{self.code} - {self.name}'


class AccountType(models.TextChoices):
    PRINCIPAL = 'PRINCIPAL', 'Compte Principal'
    PAIE = 'PAIE', 'Compte Paie'
    FOURNISSEURS = 'FOURNISSEURS', 'Compte Fournisseurs'
    INVESTISSEMENT = 'INVESTISSEMENT', 'Compte Investissement'
    PROJET = 'PROJET', 'Compte Projet'
    TAXES = 'TAXES', 'Compte Taxes'
    FILIALES = 'FILIALES', 'Compte Filiales'


class BankAccount(models.Model):
    bank = models.ForeignKey(Bank, on_delete=models.PROTECT, related_name='accounts')
    account_number = models.CharField(max_length=50)
    account_name = models.CharField(max_length=200)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    account_type = models.CharField(max_length=20, choices=AccountType.choices, default=AccountType.PRINCIPAL)
    iban = models.CharField(max_length=34, blank=True)
    is_active = models.BooleanField(default=True)
    opening_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Compte bancaire'
        verbose_name_plural = 'Comptes bancaires'
        unique_together = [['bank', 'account_number']]
        ordering = ['bank__name', 'account_name']

    def __str__(self):
        return f'{self.account_name} ({self.account_number})'
