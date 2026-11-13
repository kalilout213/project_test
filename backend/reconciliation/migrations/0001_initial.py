from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('banks', '0001_initial'),
        ('statements', '0001_initial'),
        ('accounting', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReconciliationSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('status', models.CharField(choices=[('DRAFT', 'Brouillon'), ('IN_PROGRESS', 'En cours'), ('COMPLETED', 'Complété'), ('VALIDATED', 'Validé')], default='DRAFT', max_length=15)),
                ('auto_match_threshold', models.IntegerField(default=80)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('validated_at', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('bank_account', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='reconciliation_sessions', to='banks.bankaccount')),
                ('journal', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='reconciliation_sessions', to='accounting.accountingjournal')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='created_sessions', to=settings.AUTH_USER_MODEL)),
                ('validated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='validated_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Session de rapprochement', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='ReconciliationMatch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('score', models.IntegerField(default=0)),
                ('is_manual', models.BooleanField(default=False)),
                ('matched_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='matches', to='reconciliation.reconciliationsession')),
                ('bank_transaction', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='statements.banktransaction')),
                ('accounting_entry', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='accounting.accountingentry')),
                ('matched_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Rapprochement', 'ordering': ['-score', '-matched_at'],
                     'unique_together': {('session', 'bank_transaction'), ('session', 'accounting_entry')}},
        ),
        migrations.CreateModel(
            name='ReconciliationGap',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('gap_type', models.CharField(choices=[('BANQUE_SANS_COMPTA', 'Banque sans écriture comptable'), ('COMPTA_SANS_BANQUE', 'Écriture comptable sans transaction bancaire'), ('MONTANT_DIFFERENT', 'Montants différents'), ('DATE_DIFFERENTE', 'Dates différentes')], max_length=25)),
                ('status', models.CharField(choices=[('OUVERT', 'Ouvert'), ('EXPLIQUE', 'Expliqué'), ('RESOLU', 'Résolu')], default='OUVERT', max_length=10)),
                ('amount_difference', models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True)),
                ('justification', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gaps', to='reconciliation.reconciliationsession')),
                ('bank_transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='statements.banktransaction')),
                ('accounting_entry', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='accounting.accountingentry')),
                ('resolved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Écart de rapprochement', 'ordering': ['-created_at']},
        ),
    ]
