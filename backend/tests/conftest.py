import uuid

import pytest


@pytest.fixture(autouse=True)
def isoler_cache_des_tests(request, settings):
    """Chaque test unitaire a son cache ; les tests Redis utilisent leurs propres clés."""
    if request.node.get_closest_marker("integration") is None:
        settings.CACHES = {
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": uuid.uuid4().hex,
            },
        }
