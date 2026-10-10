from django.conf import settings
from django.core.checks import Error


def verifier_cache_partage(app_configs, **kwargs):
    backend = settings.CACHES.get("default", {}).get("BACKEND")
    if backend != "django.core.cache.backends.redis.RedisCache":
        return [
            Error(
                "Le déploiement nécessite le cache Redis partagé.",
                hint="Configurer CACHE_URL et REDIS_PASSWORD pour les workers de l'API.",
                id="core.E001",
            ),
        ]
    return []
