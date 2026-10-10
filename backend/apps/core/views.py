from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@extend_schema(summary="État du service", responses={200: OpenApiTypes.OBJECT})
@api_view(["GET"])
@authentication_classes([])
# Exception justifiée : sonde de supervision, publique par conception, sans aucune donnée.
@permission_classes([AllowAny])  # nosemgrep: drf-allowany-a-justifier
def health(request: Request) -> Response:
    """Sonde utilisée par Docker, la pipeline et le monitoring. Ne renvoie aucune donnée."""
    return Response({"status": "ok"})
