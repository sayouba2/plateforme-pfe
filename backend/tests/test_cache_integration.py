import uuid

import pytest
from django.conf import settings
from django.core.cache.backends.redis import RedisCache
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.throttling import AnonRateThrottle


@pytest.mark.integration
def test_compteurs_partages_entre_deux_clients_redis():
    """Deux clients indépendants doivent appliquer le même quota séquentiel."""
    config = settings.CACHES["default"]
    assert config["BACKEND"] == "django.core.cache.backends.redis.RedisCache", (
        "Les tests d'intégration nécessitent CACHE_URL vers un Redis dédié aux tests."
    )
    params = {**config, "KEY_PREFIX": f"pfe-test-{uuid.uuid4().hex}"}
    client_1 = RedisCache(config["LOCATION"], params)
    client_2 = RedisCache(config["LOCATION"], params)

    class DebitDeTest(AnonRateThrottle):
        rate = "2/min"

    premier, second = DebitDeTest(), DebitDeTest()
    premier.cache, second.cache = client_1, client_2
    requete = Request(APIRequestFactory().get("/test/", REMOTE_ADDR="192.0.2.1"))
    cle_compteur = premier.get_cache_key(requete, view=None)
    try:
        assert premier.allow_request(requete, view=None)
        assert second.allow_request(requete, view=None)
        assert not premier.allow_request(requete, view=None)
        assert not second.allow_request(requete, view=None)
    finally:
        client_1.delete(cle_compteur)
        client_1.close()
        client_2.close()
