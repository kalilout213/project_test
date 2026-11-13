from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Currency',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=3, unique=True)),
                ('name', models.CharField(max_length=100)),
                ('symbol', models.CharField(max_length=10)),
            ],
            options={'verbose_name': 'Devise', 'ordering': ['code']},
        ),
        migrations.CreateModel(
            name='Bank',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=20, unique=True)),
                ('name', models.CharField(max_length=200)),
                ('country', models.CharField(default="Côte d'Ivoire", max_length=100)),
                ('swift_code', models.CharField(blank=True, max_length=11)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'verbose_name': 'Banque', 'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='BankAccount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('account_number', models.CharField(max_length=50)),
                ('account_name', models.CharField(max_length=200)),
                ('account_type', models.CharField(
                    choices=[
                        ('PRINCIPAL', 'Compte Principal'),
                        ('PAIE', 'Compte Paie'),
                        ('FOURNISSEURS', 'Compte Fournisseurs'),
                        ('INVESTISSEMENT', 'Compte Investissement'),
                        ('PROJET', 'Compte Projet'),
                        ('TAXES', 'Compte Taxes'),
                        ('FILIALES', 'Compte Filiales'),
                    ],
                    default='PRINCIPAL',
                    max_length=20,
                )),
                ('iban', models.CharField(blank=True, max_length=34)),
                ('is_active', models.BooleanField(default=True)),
                ('opening_balance', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('bank', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='accounts', to='banks.bank')),
                ('currency', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='banks.currency')),
            ],
            options={
                'verbose_name': 'Compte bancaire',
                'verbose_name_plural': 'Comptes bancaires',
                'ordering': ['bank__name', 'account_name'],
                'unique_together': {('bank', 'account_number')},
            },
        ),
    ]
