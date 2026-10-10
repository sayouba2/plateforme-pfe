# syntax=docker/dockerfile:1

# --- Étape 1 : installation des dépendances (versions et hachages du uv.lock) ---
FROM python:3.13-slim AS dependances

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv

RUN pip install "uv==0.13.0"

WORKDIR /build
COPY pyproject.toml uv.lock ./
# --locked : refuse d'installer si le uv.lock ne correspond plus au pyproject.toml
RUN uv sync --locked --no-dev


# --- Étape 2 : image d'exécution minimale, sans uv ni outils de build ---
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Utilisateur sans privilèges : le processus ne tourne jamais en root.
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin app

WORKDIR /app
COPY --from=dependances /opt/venv /opt/venv
# Le code reste la propriété de root : l'utilisateur « app » peut le lire, pas le modifier.
COPY . .

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/', timeout=2)"]

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
