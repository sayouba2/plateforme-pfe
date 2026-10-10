from django.core.checks import Tags, run_checks


def test_deploiement_refuse_cache_memoire():
    erreurs = run_checks(tags=[Tags.caches], include_deployment_checks=True)
    assert any(erreur.id == "core.E001" for erreur in erreurs)


def test_deploiement_accepte_configuration_redis(settings):
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": "redis://localhost:6379/1",
        },
    }
    erreurs = run_checks(tags=[Tags.caches], include_deployment_checks=True)
    assert not any(erreur.id == "core.E001" for erreur in erreurs)
