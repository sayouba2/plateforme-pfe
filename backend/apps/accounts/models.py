from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models


class Role(models.TextChoices):
    ETUDIANT = "etudiant", "Étudiant"
    RESPONSABLE_ENTREPRISE = "responsable_entreprise", "Responsable entreprise"
    TUTEUR_ENTREPRISE = "tuteur_entreprise", "Tuteur entreprise"
    ENCADRANT_ACADEMIQUE = "encadrant_academique", "Encadrant académique"
    ADMINISTRATEUR = "administrateur", "Administrateur"


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("role", Role.ADMINISTRATEUR)
        if extra_fields["role"] != Role.ADMINISTRATEUR:
            raise ValueError("Un superutilisateur doit avoir le rôle administrateur.")
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """Un compte porte un rôle métier ; les droits Django restent distincts."""

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.ETUDIANT)

    objects = UserManager()

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(role__in=Role.values),
                name="accounts_user_role_valide",
            ),
            models.CheckConstraint(
                condition=models.Q(is_staff=False) | models.Q(role=Role.ADMINISTRATEUR),
                name="accounts_user_staff_administrateur",
            ),
            models.CheckConstraint(
                condition=models.Q(is_superuser=False) | models.Q(is_staff=True),
                name="accounts_user_superuser_staff",
            ),
        ]
