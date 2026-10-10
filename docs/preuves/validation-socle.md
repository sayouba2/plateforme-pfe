# Vérification du socle — 9 et 10 octobre 2026

Cette vérification concerne les fichiers de la copie de travail. Elle rassemble les contrôles
exécutés par l'assistant et le résultat de la suite complète transmis par le développeur depuis
son terminal le 10 octobre 2026. Aucun run GitHub Actions ni déploiement n'est présenté comme réussi.

| Contrôle exécuté | Résultat |
| --- | --- |
| Ruff sur le backend | Réussi avec la version verrouillée 0.17.0, après un premier contrôle avec 0.15.1 |
| `uv lock --check --offline` | Réussi avec uv 0.11.7 ; 73 paquets, métadonnées du projet cohérentes avec le lock |
| `uv sync --check --locked --offline` | Réussi : 70 paquets vérifiés dans le venv racine, aucun changement nécessaire sur cette plateforme |
| Contrôles Django | `check`, `makemigrations --check --dry-run` et application des migrations réussis avec `config.settings` sur SQLite en mémoire |
| Tests sans services externes | **55 réussis**, 1 test Redis non sélectionné avec `-m 'not integration'` ; configuration applicative réelle, SQLite en mémoire |
| Collecte de la suite complète | **56 tests collectés** avec la configuration locale PostgreSQL/Redis ; la collecte ne teste pas les connexions |
| Suite complète avec PostgreSQL et Redis | **56 réussis en 1,03 s**, aucun test ignoré ; exécution depuis le terminal du développeur, résultat transmis le 10 octobre 2026 |
| Configuration de production | `check --deploy --fail-level WARNING` réussi avec les paramètres HTTPS/HSTS de la CI et une clé éphémère ; disponibilité des services non vérifiée par ce contrôle |
| Bandit | Version 1.9.4, `-c pyproject.toml -r . -ll -ii` : aucun problème détecté |
| Schéma OpenAPI | Génération et validation avec `spectacular --validate --fail-on-warn` réussies |
| Chargement de l'application | `gunicorn --check-config --preload config.wsgi:application` réussi ; aucun serveur HTTP démarré par ce contrôle |
| Analyse syntaxique Python | 26 fichiers valides, migration comprise |
| Lecture TOML et YAML | `pyproject.toml`, `uv.lock`, workflow et Compose valides |
| `bash -n` sur les scripts CI | 23 étapes valides syntaxiquement ; scripts non exécutés |
| Validation Compose | Réussie avec `--env-file /dev/null --no-env-resolution --no-interpolate --quiet`, sans lecture de configuration locale ni connexion au daemon |
| Documentation | Liens locaux contrôlés ; terminologie et périmètre alignés sur un produit complet destiné à la production |

## Périmètre de la vérification Django

Le venv à la racine, complété par le développeur, fournit toutes les dépendances verrouillées,
dont Django 5.2.18, DRF 3.18.3, pytest 9.1.1 et pytest-django 4.14.0. Le contrôle de synchronisation
confirme les versions installées. L'exécution locale utilise Python 3.14.6 ; la CI utilise Python 3.13.

Un premier contrôle avait validé 49 tests avec une configuration isolée, lorsque seules certaines
dépendances étaient disponibles. Un deuxième contrôle a chargé réellement `config.settings` et
validé 55 tests, dont Argon2/authentification, sonde de santé et en-têtes HTTP, avec une clé Django
éphémère et une base SQLite en mémoire fournies uniquement pour cette exécution.

La dernière exécution, effectuée par le développeur sur PostgreSQL et Redis, valide les **56 tests** :
44 tests de comptes et permissions, 1 test d'intégration Redis, 2 tests de configuration de déploiement,
5 tests de pagination et 4 tests de sécurité du socle. La création de la base de test, l'application
des migrations et les contraintes PostgreSQL couvertes par ces tests ont réussi. Le test Redis
confirme le partage des compteurs entre deux clients. Ce résultat couvre le socle actuellement
implémenté ; les fonctionnalités métier et leurs tests restent à développer.

L'exécution a permis de corriger le formulaire de test de l'admin (date d'inscription requise) et
de vérifier qu'un gestionnaire ne peut modifier ni les données ni le mot de passe d'un autre compte
staff, ni s'attribuer le statut de superutilisateur. Aucune valeur confidentielle n'a été affichée.

## Limites de la session de l'assistant et contrôles restants

- L'installation est désormais complète. L'audit `pip-audit`, exécuté sur l'export de production
  haché du lock, reste bloqué par la résolution DNS de PyPI ; aucun résultat d'audit n'est déduit
  du seul contrôle de versions.
- Le daemon Docker reste inaccessible depuis la session de l'assistant (`permission denied` sur
  son socket). Le développeur a exécuté la suite avec ses services PostgreSQL et Redis locaux.
- Le démarrage de Gunicorn sur une adresse locale de test a été tenté ; l'environnement refuse
  la création ou l'accès au socket. Le processus de cette tentative a été arrêté, sans serveur
  laissé en arrière-plan.
- Après correction des variables locales, Django détecte bien PostgreSQL et Redis. Les deux
  connexions échouent encore depuis la session. Le diagnostic système confirme que la création
  des sockets TCP IPv4 et IPv6 est interdite (`EPERM`) ; la validité des identifiants et la
  disponibilité des services ne peuvent donc pas être établies depuis cet environnement. La suite
  réussie depuis le terminal du développeur confirme leur accessibilité pour cette exécution.
- La copie de travail n'est pas reconnue comme dépôt Git ; aucun commit, push ou run distant n'a
  été effectué.

Le démarrage HTTP, l'audit des dépendances, Semgrep, Gitleaks, Trivy et ZAP restent **à valider**
dans un environnement disposant des accès
nécessaires. Les contrôles réussis ci-dessus ne constituent pas une validation de toute la CI.

## Suite complète exécutée par le développeur

Commande exécutée depuis la racine, dans un terminal disposant de l'accès aux services Docker :

```bash
export UV_PROJECT_ENVIRONMENT="$PWD/.venv"
DJANGO_READ_DOT_ENV=True uv run --directory backend --locked pytest -x --tb=short
```

Résultat transmis : `56 passed in 1.03s`, sur Python 3.14.6, Django 5.2.18, pytest 9.1.1 et
pytest-django 4.14.0. Cette exécution a terminé toute la suite malgré l'option d'arrêt à la première
erreur (`-x`). L'exécution du pipeline sous Python 3.13 reste à confirmer.

## Diagnostic de l'exécution depuis le terminal du développeur

La première exécution externe atteignait PostgreSQL, mais la création de `test_plateforme_pfe_db`
échouait avec `psycopg.errors.InsufficientPrivilege: permission denied to create database`. Django
interrompait l'initialisation avec `SystemExit: 2`. Les 56 erreurs remontées à cette étape provenaient
de l'initialisation ; les comportements métier n'avaient pas pu être testés.

La cascade d'`AssertionError` sur `_finalizers` a été reproduite séparément avec pytest 9.1.1 :
une fixture de session qui lève `SystemExit(2)` produit ensuite cette assertion au test suivant.
La correction proposée était l'attribution de `CREATEDB` au compte de test du PostgreSQL local,
par un administrateur de cette instance ; le prérequis est documenté dans le
[README du backend](../../backend/README.md#préparer-le-compte-postgresql-des-tests).
La nouvelle exécution transmise par le développeur, avec 56 tests réussis, confirme la résolution
du blocage. Aucune modification des tests ou des contrôles de sécurité n'a été nécessaire pour
contourner cette erreur.

## Dépendance Redis

La dépendance a été déclarée via `uv add`. Faute d'accès réseau depuis l'installateur, son entrée
de verrouillage a été complétée à partir des URLs et empreintes SHA-256 des distributions officielles
[redis 8.1.0 sur PyPI](https://pypi.org/project/redis/8.1.0/#files). Les dépendances conditionnelles ont
été vérifiées dans le [pyproject officiel](https://github.com/redis/redis-py/blob/v8.1.0/pyproject.toml) :
aucune dépendance obligatoire supplémentaire pour Python 3.13 et versions suivantes.
Le contrôle de cohérence du lock réussit et la version installée correspond au verrouillage.
L'intégration avec le serveur Redis est validée par l'exécution complète du développeur.
L'audit des dépendances reste à valider.
