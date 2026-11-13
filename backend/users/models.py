from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    DIRECTEUR_FINANCIER = 'DIRECTEUR_FINANCIER', 'Directeur Financier'
    COMPTABLE = 'COMPTABLE', 'Comptable'
    TRESORIER = 'TRESORIER', 'Trésorier'
    CONTROLEUR_GESTION = 'CONTROLEUR_GESTION', 'Contrôleur de Gestion'
    AUDITEUR_INTERNE = 'AUDITEUR_INTERNE', 'Auditeur Interne'
    ADMINISTRATEUR = 'ADMINISTRATEUR', 'Administrateur Système'


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email requis')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.ADMINISTRATEUR)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=30, choices=UserRole.choices, default=UserRole.COMPTABLE)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} ({self.email})'

    @property
    def can_write(self):
        return self.role in [
            UserRole.COMPTABLE,
            UserRole.TRESORIER,
            UserRole.DIRECTEUR_FINANCIER,
            UserRole.ADMINISTRATEUR,
        ]

    @property
    def can_approve(self):
        return self.role in [UserRole.DIRECTEUR_FINANCIER, UserRole.ADMINISTRATEUR]

    @property
    def is_read_only(self):
        return self.role in [UserRole.CONTROLEUR_GESTION, UserRole.AUDITEUR_INTERNE]
