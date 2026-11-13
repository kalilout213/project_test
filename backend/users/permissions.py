from rest_framework.permissions import BasePermission
from .models import UserRole


class IsAdministrateur(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.ADMINISTRATEUR


class IsAdministrateurOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == UserRole.ADMINISTRATEUR


class CanWrite(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.can_write


class CanApprove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_approve


class IsDirecteurOrAdministrateur(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserRole.DIRECTEUR_FINANCIER, UserRole.ADMINISTRATEUR
        ]
