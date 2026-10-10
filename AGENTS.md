# Instructions pour les assistants de code

Plateforme de gestion des stages / PFE : API Django 5.2 LTS + DRF (`backend/`), web React (`web/`),
mobile React Native / Expo (`mobile/`). Projet académique de sécurité : la qualité de la démarche
DevSecOps prime sur le nombre de fonctionnalités.

## Règles obligatoires

Lire et appliquer `docs/RULES.md` avant toute modification (Claude Code le charge via la ligne suivante).

@docs/RULES.md

## Contexte à consulter selon la tâche

- Besoin, rôles, règles métier : `docs/PRD.md`
- Risques OWASP à couvrir : `docs/OWASP.md`
- Architecture et décisions : `docs/ARCHITECTURE.md`
- Diagrammes UML : `docs/conception/`

## Commandes du backend

```bash
cd backend
uv sync                                      # dépendances exactes du uv.lock
uv run pytest                                # tests, dont tests de sécurité
uv run ruff check .                          # lint + règles de sécurité
uv run bandit -c pyproject.toml -r . -ll -ii # SAST
```

## Interdits

- Lire, afficher ou modifier un fichier `.env`, une clé ou un jeton.
- Désactiver, contourner ou affaiblir un contrôle : pipeline, pre-commit, test, règle Semgrep.
- Ajouter une dépendance sans vérifier qu'elle existe et sans mettre à jour le fichier de verrouillage.
- Pousser sur `main` ou `develop`, ou réécrire l'historique Git.
