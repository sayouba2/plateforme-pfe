import secrets

import pytest
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Permission
from django.db import IntegrityError, transaction
from django.test import Client
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from apps.accounts.models import Role
from apps.accounts.permissions import (
    EstAdministrateur,
    EstEncadrantAcademique,
    EstEtudiant,
    EstResponsableEntreprise,
    EstTuteurEntreprise,
)

PERMISSIONS = [
    (EstEtudiant, Role.ETUDIANT),
    (EstResponsableEntreprise, Role.RESPONSABLE_ENTREPRISE),
    (EstTuteurEntreprise, Role.TUTEUR_ENTREPRISE),
    (EstEncadrantAcademique, Role.ENCADRANT_ACADEMIQUE),
    (EstAdministrateur, Role.ADMINISTRATEUR),
]


class ActionReservee(APIView):
    def get(self, request):
        return Response({"autorise": True})


@pytest.mark.parametrize(("permission", "role_autorise"), PERMISSIONS)
@pytest.mark.parametrize("role", Role.values)
def test_action_reservee_selon_role(permission, role_autorise, role):
    requete = APIRequestFactory().get("/action-de-test/")
    user = get_user_model()(pk=1, username="compte-fictif", role=role)
    force_authenticate(requete, user=user)
    reponse = ActionReservee.as_view(permission_classes=[permission])(requete)
    assert reponse.status_code == (200 if role == role_autorise else 403)


@pytest.mark.parametrize(("permission", "role_autorise"), PERMISSIONS)
def test_action_refuse_compte_desactive(permission, role_autorise):
    requete = APIRequestFactory().get("/action-de-test/")
    user = get_user_model()(pk=1, role=role_autorise, is_active=False)
    force_authenticate(requete, user=user)
    reponse = ActionReservee.as_view(permission_classes=[permission])(requete)
    assert reponse.status_code == 403


@pytest.mark.parametrize(("permission", "role_autorise"), PERMISSIONS)
def test_action_refuse_anonyme(permission, role_autorise):
    requete = APIRequestFactory().get("/action-de-test/")
    reponse = ActionReservee.as_view(permission_classes=[permission])(requete)
    assert reponse.status_code in (401, 403)


@pytest.mark.django_db
def test_creation_compte_et_authentification():
    mot_de_passe = secrets.token_urlsafe(24)
    user = get_user_model().objects.create_user("etudiant-fictif", password=mot_de_passe)
    user.refresh_from_db()
    assert user.role == Role.ETUDIANT
    assert not user.is_staff
    assert not user.is_superuser
    assert user.password.startswith("argon2$")
    assert authenticate(username=user.username, password=mot_de_passe) == user
    user.is_active = False
    user.save(update_fields=["is_active"])
    assert authenticate(username=user.username, password=mot_de_passe) is None


@pytest.mark.django_db
def test_superutilisateur_est_administrateur():
    user = get_user_model().objects.create_superuser(
        "admin-fictif", password=secrets.token_urlsafe(24)
    )
    assert user.role == Role.ADMINISTRATEUR
    assert user.is_staff and user.is_superuser


@pytest.mark.django_db
def test_superutilisateur_ne_peut_pas_etre_etudiant():
    with pytest.raises(ValueError, match="rôle administrateur"):
        get_user_model().objects.create_superuser("fictif", role=Role.ETUDIANT)


@pytest.mark.django_db
@pytest.mark.parametrize(
    "changements",
    [
        {"role": "role_inconnu"},
        {"is_staff": True},
        {"is_superuser": True},
    ],
)
def test_base_refuse_role_invalide_ou_privileges_incoherents(changements):
    user = get_user_model().objects.create_user("compte-fictif")
    with pytest.raises(IntegrityError), transaction.atomic():
        get_user_model().objects.filter(pk=user.pk).update(**changements)


@pytest.mark.django_db
@pytest.mark.parametrize("superutilisateur", [False, True])
def test_admin_metier_ne_peut_pas_modifier_un_autre_compte_staff(superutilisateur):
    users = get_user_model().objects
    if superutilisateur:
        cible = users.create_superuser("technique-fictif")
    else:
        cible = users.create_user("technique-fictif", role=Role.ADMINISTRATEUR, is_staff=True)
    responsable = users.create_user("gestionnaire-fictif", role=Role.ADMINISTRATEUR, is_staff=True)
    responsable.user_permissions.set(
        Permission.objects.filter(
            content_type__app_label="accounts", codename__in=["change_user", "view_user"]
        )
    )
    client = Client()
    client.force_login(responsable)
    reponse = client.post(
        f"/admin/accounts/user/{cible.pk}/change/",
        {"username": "modification-interdite", "role": Role.ADMINISTRATEUR},
        secure=True,
    )
    assert reponse.status_code in (302, 403, 404)
    cible.refresh_from_db()
    assert cible.username == "technique-fictif"

    # La route de changement de mot de passe doit respecter le même périmètre.
    mot_de_passe = secrets.token_urlsafe(24)
    reponse = client.post(
        f"/admin/accounts/user/{cible.pk}/password/",
        {"password1": mot_de_passe, "password2": mot_de_passe},
        secure=True,
    )
    assert reponse.status_code == 404
    cible.refresh_from_db()
    assert not cible.has_usable_password()


@pytest.mark.django_db
def test_admin_metier_ne_peut_pas_etendre_ses_privileges():
    responsable = get_user_model().objects.create_user(
        "gestionnaire-fictif", role=Role.ADMINISTRATEUR, is_staff=True
    )
    responsable.user_permissions.set(
        Permission.objects.filter(
            content_type__app_label="accounts", codename__in=["change_user", "view_user"]
        )
    )
    client = Client()
    client.force_login(responsable)

    # Le formulaire de son propre compte doit ignorer les privilèges forgés.
    reponse = client.post(
        f"/admin/accounts/user/{responsable.pk}/change/",
        {
            "username": responsable.username,
            "first_name": "Profil modifié",
            "role": Role.ADMINISTRATEUR,
            "is_active": "on",
            "is_staff": "on",
            "is_superuser": "on",
            "date_joined_0": "2026-10-09",
            "date_joined_1": "10:00:00",
        },
        secure=True,
    )
    assert reponse.status_code == 302
    responsable.refresh_from_db()
    assert responsable.first_name == "Profil modifié"
    assert not responsable.is_superuser
