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
            name='BankStatement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('file_name', models.CharField(max_length=255)),
                ('file_format', models.CharField(choices=[('CSV', 'CSV'), ('EXCEL', 'Excel'), ('MT940', 'MT940 (SWIFT)'), ('CAMT053', 'CAMT.053 (ISO 20022)')], max_length=10)),
                ('status', models.CharField(choices=[('PENDING', 'En attente'), ('PROCESSING', 'En cours'), ('COMPLETED', 'Importé'), ('ERROR', 'Erreur')], default='PENDING', max_length=15)),
                ('period_start', models.DateField(blank=True, null=True)),
                ('period_end', models.DateField(blank=True, null=True)),
                ('transaction_count', models.IntegerField(default=0)),
                ('total_debit', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('total_credit', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('imported_at', models.DateTimeField(auto_now_add=True)),
                ('error_message', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('bank_account', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='statements', to='banks.bankaccount')),
                ('imported_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='imported_statements', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Relevé bancaire', 'verbose_name_plural': 'Relevés bancaires', 'ordering': ['-imported_at']},
        ),
        migrations.CreateModel(
            name='BankTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('transaction_date', models.DateField()),
                ('value_date', models.DateField(blank=True, null=True)),
                ('description', models.TextField()),
                ('reference', models.CharField(blank=True, max_length=255)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=18)),
                ('transaction_type', models.CharField(choices=[('DEBIT', 'Débit'), ('CREDIT', 'Crédit')], max_length=6)),
                ('balance_after', models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True)),
                ('is_reconciled', models.BooleanField(default=False)),
                ('reconciliation_id', models.IntegerField(blank=True, null=True)),
                ('raw_data', models.JSONField(blank=True, default=dict)),
                ('statement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='statements.bankstatement')),
            ],
            options={'verbose_name': 'Transaction bancaire', 'verbose_name_plural': 'Transactions bancaires', 'ordering': ['-transaction_date', 'id']},
        ),
        migrations.AddIndex(
            model_name='banktransaction',
            index=models.Index(fields=['transaction_date'], name='statements__transact_idx'),
        ),
        migrations.AddIndex(
            model_name='banktransaction',
            index=models.Index(fields=['is_reconciled'], name='statements__is_reco_idx'),
        ),
        migrations.AddIndex(
            model_name='banktransaction',
            index=models.Index(fields=['reference'], name='statements__referen_idx'),
        ),
    ]
