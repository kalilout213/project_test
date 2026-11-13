from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('is_superuser', models.BooleanField(default=False)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('full_name', models.CharField(max_length=150)),
                ('role', models.CharField(
                    choices=[
                        ('DIRECTEUR_FINANCIER', 'Directeur Financier'),
                        ('COMPTABLE', 'Comptable'),
                        ('TRESORIER', 'Trésorier'),
                        ('CONTROLEUR_GESTION', 'Contrôleur de Gestion'),
                        ('AUDITEUR_INTERNE', 'Auditeur Interne'),
                        ('ADMINISTRATEUR', 'Administrateur Système'),
                    ],
                    default='COMPTABLE',
                    max_length=30,
                )),
                ('is_active', models.BooleanField(default=True)),
                ('is_staff', models.BooleanField(default=False)),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now)),
                ('last_login', models.DateTimeField(blank=True, null=True)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('department', models.CharField(blank=True, max_length=100)),
                ('groups', models.ManyToManyField(blank=True, related_name='user_set', to='auth.group')),
                ('user_permissions', models.ManyToManyField(blank=True, related_name='user_set', to='auth.permission')),
            ],
            options={'verbose_name': 'Utilisateur', 'verbose_name_plural': 'Utilisateurs', 'ordering': ['full_name']},
        ),
    ]
