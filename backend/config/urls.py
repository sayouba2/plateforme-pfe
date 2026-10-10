from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Phase 2 : restreindre l'accès à l'admin Django (réseau interne via Nginx, MFA).
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
]

if settings.API_DOCS_ENABLED:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    ]
