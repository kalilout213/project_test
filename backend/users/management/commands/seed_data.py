"""
Management command to seed the database with realistic test data.
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
import random
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Seed database with test data for development'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        self._create_users()
        self._create_banks()
        self._create_journals()
        self.stdout.write(self.style.SUCCESS('Done! See README or run --help for login credentials.'))
        self.stdout.write('')
        self.stdout.write('  Admin:      admin@traore.ci / admin1234')
        self.stdout.write('  Directeur:  directeur@traore.ci / traore1234')
        self.stdout.write('  Comptable:  comptable@traore.ci / traore1234')

    def _create_users(self):
        from users.models import User, UserRole
        users = [
            dict(email='admin@traore.ci', full_name='Administrateur Système', role=UserRole.ADMINISTRATEUR, password='admin1234', is_staff=True, is_superuser=True),
            dict(email='directeur@traore.ci', full_name='Moussa Traoré', role=UserRole.DIRECTEUR_FINANCIER, password='traore1234'),
            dict(email='comptable@traore.ci', full_name='Aminata Koné', role=UserRole.COMPTABLE, password='traore1234'),
            dict(email='tresorier@traore.ci', full_name='Ibrahim Coulibaly', role=UserRole.TRESORIER, password='traore1234'),
            dict(email='controleur@traore.ci', full_name='Fatoumata Diallo', role=UserRole.CONTROLEUR_GESTION, password='traore1234'),
            dict(email='auditeur@traore.ci', full_name='Seydou Bamba', role=UserRole.AUDITEUR_INTERNE, password='traore1234'),
        ]
        for u in users:
            pw = u.pop('password')
            obj, created = User.objects.get_or_create(email=u['email'], defaults=u)
            if created:
                obj.set_password(pw)
                obj.save()
                self.stdout.write(f'  Created user: {obj.email}')

    def _create_banks(self):
        from banks.models import Currency, Bank, BankAccount, AccountType
        xof, _ = Currency.objects.get_or_create(code='XOF', defaults={'name': 'Franc CFA BCEAO', 'symbol': 'FCFA'})
        eur, _ = Currency.objects.get_or_create(code='EUR', defaults={'name': 'Euro', 'symbol': '€'})

        bci, _ = Bank.objects.get_or_create(name='BCI Côte d\'Ivoire', defaults={
            'swift_code': 'BCIABICIA', 'country': 'CI', 'is_active': True,
        })
        sgbci, _ = Bank.objects.get_or_create(name='Société Générale CI', defaults={
            'swift_code': 'SGCIABICIA', 'country': 'CI', 'is_active': True,
        })

        accounts = [
            dict(bank=bci, currency=xof, account_number='CI93BCI0001000012345600', account_name='Compte Courant Principal', account_type=AccountType.CHECKING),
            dict(bank=bci, currency=xof, account_number='CI93BCI0001000099876500', account_name='Compte Épargne', account_type=AccountType.SAVINGS),
            dict(bank=sgbci, currency=eur, account_number='CI93SG00020000056789012', account_name='Compte Devises EUR', account_type=AccountType.FOREIGN_CURRENCY),
        ]
        for a in accounts:
            obj, created = BankAccount.objects.get_or_create(account_number=a['account_number'], defaults=a)
            if created:
                self.stdout.write(f'  Created account: {obj.account_number}')

    def _create_journals(self):
        from accounting.models import AccountingJournal, JournalType
        journals = [
            dict(code='AC', name='Achats', journal_type=JournalType.PURCHASE),
            dict(code='VT', name='Ventes', journal_type=JournalType.SALE),
            dict(code='BQ', name='Banque BCI', journal_type=JournalType.BANK),
            dict(code='CA', name='Caisse', journal_type=JournalType.CASH),
            dict(code='OD', name='Opérations Diverses', journal_type=JournalType.MISC),
        ]
        for j in journals:
            obj, created = AccountingJournal.objects.get_or_create(code=j['code'], defaults=j)
            if created:
                self.stdout.write(f'  Created journal: {obj.code} - {obj.name}')
