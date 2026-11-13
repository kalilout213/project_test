from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('banks', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AccountingJournal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=10, unique=True)),
                ('name', models.CharField(max_length=100)),
                ('journal_type', models.CharField(choices=[('BANQUE', 'Journal de Banque'), ('VENTES', 'Journal des Ventes'), ('ACHATS', 'Journal des Achats'), ('CAISSE', 'Journal de Caisse'), ('OD', 'Opérations Diverses'), ('PAIE', 'Journal de Paie')], max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('bank_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='journals', to='banks.bankaccount')),
            ],
            options={'verbose_name': 'Journal comptable', 'verbose_name_plural': 'Journaux comptables', 'ordering': ['code']},
        ),
        migrations.CreateModel(
            name='AccountingEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('entry_date', models.DateField()),
                ('piece_number', models.CharField(blank=True, max_length=50)),
                ('account_code', models.CharField(max_length=20)),
                ('account_label', models.CharField(blank=True, max_length=255)),
                ('description', models.TextField()),
                ('reference', models.CharField(blank=True, max_length=255)),
                ('debit', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('credit', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('is_reconciled', models.BooleanField(default=False)),
                ('reconciliation_id', models.IntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('journal', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='entries', to='accounting.accountingjournal')),
            ],
            options={'verbose_name': 'Écriture comptable', 'verbose_name_plural': 'Écritures comptables', 'ordering': ['-entry_date', 'piece_number']},
        ),
        migrations.CreateModel(
            name='AccountingImport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('file_name', models.CharField(max_length=255)),
                ('imported_at', models.DateTimeField(auto_now_add=True)),
                ('entry_count', models.IntegerField(default=0)),
                ('status', models.CharField(default='COMPLETED', max_length=20)),
                ('error_message', models.TextField(blank=True)),
                ('imported_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('journal', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='accounting.accountingjournal')),
            ],
            options={'ordering': ['-imported_at']},
        ),
        migrations.AddIndex(
            model_name='accountingentry',
            index=models.Index(fields=['entry_date'], name='accounting__entry_d_idx'),
        ),
        migrations.AddIndex(
            model_name='accountingentry',
            index=models.Index(fields=['account_code'], name='accounting__account_idx'),
        ),
        migrations.AddIndex(
            model_name='accountingentry',
            index=models.Index(fields=['is_reconciled'], name='accounting__is_reco_idx'),
        ),
    ]
