from django.apps import AppConfig
from django.core.checks import Tags, register


class CoreConfig(AppConfig):
    name = "apps.core"
    verbose_name = "Socle"

    def ready(self):
        from .checks import verifier_cache_partage

        register(Tags.caches, deploy=True)(verifier_cache_partage)
