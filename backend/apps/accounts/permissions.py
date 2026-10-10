from rest_framework.permissions import BasePermission

from .models import Role


class PermissionDeRole(BasePermission):
    """Refuse aussi les comptes désactivés, y compris avec une session existante."""

    role = None

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and self.role is not None
            and user.role == self.role
        )


class EstEtudiant(PermissionDeRole):
    role = Role.ETUDIANT


class EstResponsableEntreprise(PermissionDeRole):
    role = Role.RESPONSABLE_ENTREPRISE


class EstTuteurEntreprise(PermissionDeRole):
    role = Role.TUTEUR_ENTREPRISE


class EstEncadrantAcademique(PermissionDeRole):
    role = Role.ENCADRANT_ACADEMIQUE


class EstAdministrateur(PermissionDeRole):
    role = Role.ADMINISTRATEUR
