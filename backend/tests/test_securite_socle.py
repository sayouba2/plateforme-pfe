"""
Tests de non-régression de sécurité du socle de l'API.

Ils échouent si quelqu'un affaiblit une protection de base. Ce sont les premiers
tests de la pratique Tier 1 « Automated Security Testing ». Les tests d'autorisation
par rôle (BOLA, BFLA) s'ajouteront ici à partir de la matrice d'autorisations.
"""

from django.conf import settings
from rest_framework.response import Response
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.views import APIView


class VueSansPermissionExplicite(APIView):
    """Simule un endpoint écrit sans déclarer de permission."""

    def get(self, request):
        return Response({"donnee": "sensible"})


def test_sonde_health_publique():
    reponse = APIClient().get("/api/health/")
    assert reponse.status_code == 200
    assert reponse.json() == {"status": "ok"}


def test_api_fermee_par_defaut():
    """Un endpoint sans permission explicite doit refuser un utilisateur anonyme."""
    requete = APIRequestFactory().get("/fictif/")
    reponse = VueSansPermissionExplicite.as_view()(requete)
    assert reponse.status_code in (401, 403)


def test_entetes_de_securite_presents():
    reponse = APIClient().get("/api/health/")
    assert reponse["X-Frame-Options"] == "DENY"
    assert reponse["X-Content-Type-Options"] == "nosniff"


def test_mots_de_passe_haches_avec_argon2():
    assert settings.PASSWORD_HASHERS[0].endswith("Argon2PasswordHasher")
