# Backend — API Django REST

Django 5.2 (LTS) + Django REST Framework, Python 3.14, dépendances gérées avec [uv](https://docs.astral.sh/uv/).

Si le venv existe déjà dans `.venv/` à la racine, le compléter depuis la racine avec les versions
du lock, outils de développement compris :

```bash
export UV_PROJECT_ENVIRONMENT="$PWD/.venv"
uv sync --project backend --locked
```

Cet export permet aussi aux commandes `uv run` ci-dessous de réutiliser ce venv. Sans cet export,
uv gère son environnement dans `backend/.venv`. Les dépendances directes sont déclarées dans
`pyproject.toml` ; toutes leurs dépendances et versions exactes sont consignées dans `uv.lock`.

## Démarrer en local

```bash
pip install uv                 # une fois
cd backend
uv sync --locked               # vérifie uv.lock et installe les versions verrouillées
cp -n ../config.local.example ../.env # compléter les secrets vides ; conserver un .env existant
DJANGO_READ_DOT_ENV=True uv run --locked python manage.py migrate
DJANGO_READ_DOT_ENV=True uv run --locked python manage.py runserver
```

- Sonde : http://localhost:8000/api/health/
- Documentation de l'API (si `DJANGO_API_DOCS_ENABLED=True`) : http://localhost:8000/api/docs/

La lecture du fichier de configuration local est **explicite** avec `DJANGO_READ_DOT_ENV=True`.
En conteneur et en CI, les paramètres sont fournis par l'environnement, sans lecture de ce fichier.
`AUTH_USER_MODEL=accounts.User` est déjà configuré : la migration initiale des comptes doit faire
partie de toute nouvelle base. Si une base contient déjà les anciennes tables `auth.User`, préparer
une migration de données dédiée avant d'appliquer ces changements ; ne pas effacer cette base.

`CACHE_URL` désigne le Redis partagé ; `REDIS_PASSWORD` transmet son mot de passe séparément.
Si PostgreSQL et Redis tournent dans Docker et Django dans le venv de la machine, renseigner
`DATABASE_URL` et `CACHE_URL` avec l'hôte et les **ports publiés sur la machine**. Les noms de services
`db` et `redis` sont résolus entre conteneurs, pas par le venv. Les variables `POSTGRES_DB`,
`POSTGRES_USER` et `POSTGRES_PASSWORD` seules configurent Compose ; elles ne remplacent pas
`DATABASE_URL` pour ce lancement. Le chargement local nécessite `DJANGO_READ_DOT_ENV=True`.

Sans `CACHE_URL`, le cache mémoire convient uniquement au développement à un seul processus.
Compose impose Redis pour les trois workers et `check --deploy` refuse le cache mémoire.
La pagination utilise 20 éléments par défaut et
plafonne `page_size` à 100.

## Commandes utiles

| Action | Commande |
| --- | --- |
| Suite complète (PostgreSQL et Redis dédiés aux tests) | `uv run --locked pytest` |
| Tests unitaires seuls (SQLite et cache mémoire) | `uv run --locked pytest -m 'not integration'` |
| Lint + règles de sécurité | `uv run --locked ruff check .` |
| SAST | `uv run --locked bandit -c pyproject.toml -r . -ll -ii` |
| Cohérence du verrouillage | `uv lock --check` |
| Migrations cohérentes avec les modèles | `uv run --locked python manage.py makemigrations --check --dry-run` |
| Ajouter une dépendance | `uv add nom-du-paquet` (met à jour `pyproject.toml` et `uv.lock`) |
| Ajouter un outil de dev | `uv add --dev nom-du-paquet` |
| Créer une application métier | `uv run python manage.py startapp nom apps/nom` |

Toujours commiter `pyproject.toml` **et** `uv.lock` ensemble : la pipeline refuse un lock désynchronisé.

Les tests nécessitent une configuration d'exécution avec une clé Django éphémère et, pour la suite
complète, `DATABASE_URL` et `CACHE_URL` vers des services de test. Ils ne doivent jamais cibler une
base de production. La CI fournit ces services, génère la clé sans l'afficher et exécute toute la suite.
Le test Redis échoue explicitement si le service requis n'est pas configuré.

### Préparer le compte PostgreSQL des tests

Django crée une base séparée, préfixée par `test_`, puis la supprime en fin de suite. Le compte
PostgreSQL utilisé pour les tests doit pouvoir créer cette base, même si la base de développement
existe déjà. Sur le PostgreSQL local de Docker, un administrateur peut attribuer le droit nécessaire :

```sql
ALTER ROLE "UTILISATEUR_DES_TESTS" CREATEDB;
```

Remplacer `UTILISATEUR_DES_TESTS` par le compte utilisé dans `DATABASE_URL` pour les tests locaux.
Ce droit concerne l'environnement de développement/test ; le compte applicatif de production reste
sans droit de création de bases. Voir la [documentation Django](https://docs.djangoproject.com/en/5.2/topics/testing/overview/#the-test-database).

Si l'exécution affiche `permission denied to create database`, puis `SystemExit: 2` et de nombreux
`AssertionError` sur `_finalizers`, traiter d'abord le refus PostgreSQL. Avec pytest 9.1.1,
l'arrêt de l'initialisation peut entraîner ces erreurs en cascade. Pour isoler la première erreur,
relancer depuis la racine :

```bash
export UV_PROJECT_ENVIRONMENT="$PWD/.venv"
DJANGO_READ_DOT_ENV=True uv run --directory backend --locked pytest -x -vv --tb=short
```

La dépendance `redis` utilise le backend natif Django ; provenance vérifiée sur
[PyPI](https://pypi.org/project/redis/8.1.0/) et le
[dépôt officiel redis-py](https://github.com/redis/redis-py). Ses distributions sont hachées dans le lock.

## Applications du backend

Le socle `accounts` est créé avant les premières migrations. Les autres domaines, issus du diagramme
de cas d'utilisation, seront implémentés après leur modèle de classes et leur contrat d'API :

| Application | Contenu |
| --- | --- |
| `accounts` | Utilisateur et 5 rôles présents ; inscription, validation des comptes entreprise et tuteurs à livrer |
| `offers` | Offres de stage |
| `applications` | Candidatures, téléversement des CV |
| `agreements` | Conventions (approbation entreprise, validation admin) |
| `internships` | Suivi : affectation encadrant et tuteur, rapports, commentaires |
| `evaluations` | Fiche d'évaluation entreprise, note du rapport final |
| `assistant` | IA : score de compatibilité CV ↔ offre, assistant RAG |
| `audit` | Journal d'audit des actions sensibles |
