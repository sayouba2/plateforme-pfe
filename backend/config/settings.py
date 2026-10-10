"""
Configuration Django de la plateforme de gestion des stages / PFE.

Règle : aucune valeur sensible ou propre à un environnement n'est écrite ici.
Elles viennent de variables d'environnement (fichier .env en local, jamais commité ;
variables du conteneur ou de la CI ailleurs). Voir config.local.example à la racine du dépôt.
"""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
_FICHIER_ENV = BASE_DIR.parent / ".env"
if env.bool("DJANGO_READ_DOT_ENV", default=False) and _FICHIER_ENV.exists():
    environ.Env.read_env(_FICHIER_ENV)

# --- Base -------------------------------------------------------------------

SECRET_KEY = env("DJANGO_SECRET_KEY")  # obligatoire : l'application refuse de démarrer sans
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    # Applications métier à créer après le diagramme de classes :
    # "apps.offers", "apps.applications", "apps.agreements",
    # "apps.internships", "apps.evaluations", "apps.assistant", "apps.audit",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    # PostgreSQL via Docker Compose ; SQLite par défaut pour les tests et le développement rapide.
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
}

# --- Authentification ---------------------------------------------------------

AUTH_USER_MODEL = "accounts.User"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",  # recommandé par l'OWASP
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- API REST -----------------------------------------------------------------

REST_FRAMEWORK = {
    # Refus par défaut : un endpoint public doit le déclarer explicitement (AllowAny),
    # ce qui est signalé par la règle Semgrep « drf-allowany-a-justifier ».
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        # À livrer en P1 : authentification par jeton (JWT) pour l'application mobile.
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.PaginationStandard",
    "PAGE_SIZE": 20,
    # Limitation de débit (OWASP API4). CACHE_URL active le cache partagé Redis.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("DJANGO_THROTTLE_ANON", default="60/min"),
        "user": env("DJANGO_THROTTLE_USER", default="300/min"),
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# Sans CACHE_URL : développement à un seul processus et tests unitaires uniquement.
# Compose et les tests d'intégration fournissent un Redis partagé entre les workers.
_CACHE_URL = env("CACHE_URL", default="")
if _CACHE_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _CACHE_URL,
            "KEY_PREFIX": "pfe",
            "OPTIONS": {
                "password": env("REDIS_PASSWORD", default=None),
                "socket_connect_timeout": 2,
                "socket_timeout": 2,
            },
        },
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "pfe-local",
        },
    }

# Documentation de l'API (schéma OpenAPI + Swagger) : désactivée par défaut,
# activée en développement et pour le DAST dans la pipeline.
API_DOCS_ENABLED = env.bool("DJANGO_API_DOCS_ENABLED", default=False)
_URL_PUBLIQUE_API = env("DJANGO_API_PUBLIC_URL", default="")

SPECTACULAR_SETTINGS = {
    "TITLE": "API Plateforme de gestion des stages / PFE",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVERS": [{"url": _URL_PUBLIQUE_API}] if _URL_PUBLIQUE_API else [],
}

CORS_ALLOWED_ORIGINS = env.list("DJANGO_CORS_ALLOWED_ORIGINS", default=[])
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])

# --- Sécurité HTTP (vérifiée par « manage.py check --deploy » dans la pipeline) ---

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# L'API est servie derrière Nginx, qui termine TLS et transmet X-Forwarded-Proto.
# Ne jamais exposer Django directement à Internet avec ce réglage.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0

# Exception assumée : pas d'inscription du domaine à la liste HSTS preload des navigateurs
# (inscription difficile à annuler, inutile pour un projet académique).
SILENCED_SYSTEM_CHECKS = ["security.W021"]

# --- Divers -------------------------------------------------------------------

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Casablanca"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "{asctime} {levelname} {name} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": env("DJANGO_LOG_LEVEL", default="INFO")},
    "loggers": {
        # Événements de sécurité (hôte invalide, échec CSRF…) : à centraliser (Loki) en phase 2.
        "django.security": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}
