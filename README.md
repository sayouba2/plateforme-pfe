# Plateforme de gestion des stages / PFE

Projet du module « Sécurité des applications et des services » (FST Marrakech, IRISI 3) — Projet 5 :
pipeline DevSecOps augmentée par IA pour l'écosystème Python.

La plateforme relie étudiants, responsables entreprise, tuteurs entreprise, encadrants académiques et
administration autour du cycle d'un stage : offre → candidature → convention → suivi → évaluation.

Le produit est destiné à la **production à la fin du développement**. Les phases organisent la
livraison du périmètre complet ; les conditions de mise en production et l'état réel du socle sont
décrits dans [docs/ROADMAP.md](docs/ROADMAP.md).

Le périmètre actuel comprend l'API et le web. Le mobile est temporairement retiré en attendant
les correctifs de ses dépendances ; son code reste dans l'historique Git. Voir la
[décision de report et les conditions de réintégration](docs/MOBILE_TEMPORAIRE.md).

| Composant | Technologie |
| --- | --- |
| API | Django 5.2 LTS + Django REST Framework (Python 3.14) |
| Web | React (Vite) |
| Mobile (reporté) | React Native (Expo) — rôle Étudiant ; absent du périmètre actuel |
| Base de données | PostgreSQL |
| IA | LLM local (Ollama) : score de compatibilité CV ↔ offre, assistant RAG |
| CI/CD | GitHub Actions |

## Arborescence

```
plateforme-pfe/
├── .github/
│   ├── workflows/devsecops.yml    # pipeline DevSecOps
│   ├── ISSUE_TEMPLATE/            # modèles : user story, abuse story
│   ├── pull_request_template.md   # checklist sécurité de chaque PR
│   ├── CODEOWNERS                 # qui relit quelle partie
│   └── dependabot.yml             # mises à jour des dépendances
├── backend/                       # API Django (voir backend/README.md)
│   ├── config/                    # settings, urls, wsgi
│   ├── apps/core/                 # sonde /api/health/ et pagination bornée
│   ├── apps/accounts/             # utilisateur personnalisé, rôles et permissions
│   ├── tests/                     # tests, dont tests de sécurité
│   ├── pyproject.toml + uv.lock   # dépendances verrouillées et hachées
│   └── Dockerfile                 # image non-root, multi-étapes
├── web/                           # React + Vite + TypeScript (voir web/README.md)
├── infra/                         # Nginx, monitoring (phases suivantes)
├── security/semgrep/              # règles SAST propres au projet
├── docs/
│   ├── conception/                # UML PlantUML, threat model, matrice d'autorisations
│   └── preuves/                   # captures et rapports pour la soutenance
├── docker-compose.yml
├── .pre-commit-config.yaml        # contrôles avant chaque commit
└── config.local.example           # modèle public ; à copier en .env, jamais commité
```

## Démarrer

```bash
git clone https://github.com/sayouba2/plateforme-pfe.git && cd plateforme-pfe
pip install pre-commit && pre-commit install   # contrôles locaux avant chaque commit
cp -n config.local.example .env                 # compléter les secrets vides, conserver un .env existant
# Définir aussi REDIS_PASSWORD pour le cache partagé (configuration locale uniquement).
docker compose up --build                      # API sur http://localhost:8000/api/health/
```

Le premier `pre-commit` prend quelques minutes (compilation de Gitleaks). Compose décrit le
développement local, avec PostgreSQL et Redis privés ; la configuration de production complète
reste à livrer. Développement du backend sans Docker : voir [backend/README.md](backend/README.md).

## Workflow Git

La première publication utilise `chore/initialisation`. Les branches d'intégration `develop` et
`main`, ainsi que leurs protections ci-dessous, seront établies avant les premières fusions.

- `main` : version stable destinée à la livraison. Ne reçoit que `develop` ou une branche `hotfix/...`.
- `develop` : intégration continue de l'équipe (branche par défaut du dépôt).
- Une branche par issue, créée depuis `develop` : `feat/...`, `fix/...`, `docs/...`
  (aussi acceptés : `test/`, `refactor/`, `chore/`, `ci/`, `sec/`). Exemple : `feat/12-upload-cv`.
- Fusion uniquement par Pull Request : pipeline verte + 1 relecture. Le message de la PR contient
  `Closes #12` pour fermer l'issue.

Definition of Done d'une story : critères d'acceptation et de sécurité cochés, tests écrits,
pipeline verte, PR relue. Tout code produit avec une IA est relu, compris et testé avant la PR.

## Pipeline DevSecOps

| Job | Pratique Tier 1 (Prates & Pereira) | Outil | Bloque si |
| --- | --- | --- | --- |
| Nom de branche | Collaboration | script | nom de branche hors convention |
| Secrets | Shift Left (+ Secrets Management, Tier 2) | Gitleaks | secret dans l'historique |
| SAST | SAST | Bandit, Semgrep (règles publiques + `security/semgrep`) | sévérité moyenne (Bandit), ERROR (Semgrep) |
| Dépendances | Vulnerability Scanning (+ SCA, Tier 2) | pip-audit, npm audit | CVE connue (npm : sévérité haute) |
| Tests et contrôles Django | Continuous Integration, Automated Security Testing | pytest, Ruff, `check --deploy` | test, lint ou configuration de prod en échec |
| Qualité web | Continuous Integration | ESLint, TypeScript, Vite | lint, types ou compilation en échec |
| Image Docker | Vulnerability Scanning (+ Environment Hardening, Tier 2) | Trivy | CVE haute/critique corrigeable, Dockerfile mal configuré |
| DAST | DAST | OWASP ZAP (scan d'API OpenAPI) | alerte de risque élevé |
| Ticket de sécurité | Collaboration | GitHub CLI | — (ouvre une issue assignée sur `develop`/`main`) |

Pratiques couvertes hors pipeline : **Threat Modelling** (`docs/conception`), **Code Review** (relecture
obligatoire + CODEOWNERS), **Shift Left** (pre-commit). À ajouter : **Continuous Monitoring**
(Prometheus/Grafana) et **Continuous Deployment** (job de déploiement).

Les tests CI utilisent PostgreSQL et Redis éphémères. `uv --locked` refuse un verrouillage
désynchronisé du projet. L'assistance IA au diagnostic et son protocole de mesure sont spécifiés dans
[docs/DEVSECOPS_IA.md](docs/DEVSECOPS_IA.md) ; son job reste à réaliser.

Les actions GitHub sont épinglées par SHA de commit et les outils par version exacte : un tag peut être
réécrit, comme lors de la compromission de `trivy-action` en mars 2026.

## Configuration initiale du dépôt GitHub (propriétaire, une seule fois)

1. **Settings → General** : branche par défaut = `develop`.
2. **Settings → Collaborators** : inviter l'équipe (rôle Write).
3. **Settings → Rules → Rulesets → New branch ruleset**, cible `main` et `develop` :
   - Require a pull request before merging (1 approbation) ;
   - Require status checks to pass : ajouter les jobs ci-dessus après le premier run ;
   - Block force pushes, Restrict deletions.
   N'activer « Require review from Code Owners » qu'une fois `CODEOWNERS` complété (sinon un
   propriétaire unique ne peut pas faire approuver ses propres PR).
4. **Settings → Advanced Security** (gratuit pour un dépôt public) : activer Dependabot alerts,
   Dependabot security updates, Secret scanning et Push protection.

## Démarrer le web

Le client web est initialisé, avec un accueil en français. Node.js 24 LTS est utilisé en CI
et indiqué dans `.nvmrc`. Depuis la racine :

```bash
npm ci --prefix web
npm run dev --prefix web
```

Le web fournit `npm run lint`, `npm run typecheck` et `npm run build`. La CI exécute ces contrôles
et `npm audit --audit-level=high` dans `web/`. Un verrouillage absent ou incohérent fait échouer
`npm ci`. Dependabot reste activé pour le web et le backend. Les mises à jour courantes respectent
les contraintes des manifestes et sont regroupées par composant ; les migrations Django/Expo et les
versions majeures suivent une procédure dédiée. Les propositions de correctifs de sécurité restent
prioritaires. Voir la [politique de maintenance des dépendances](docs/MAINTENANCE_DEPENDANCES.md).

L'écran initial n'appelle pas encore l'API. Les parcours métier, leurs tests et
l'authentification restent à développer. Détails : [web/README.md](web/README.md),
[validation initiale des clients](docs/preuves/validation-clients.md) et
[réintégration du mobile](docs/MOBILE_TEMPORAIRE.md).

Règles minimales :
- **Web** : pas de `dangerouslySetInnerHTML` sans assainissement ; aucun secret dans le code front
  (tout ce qui est livré au navigateur est public) ; URL de l'API via `VITE_API_URL`.
- **Mobile** : jetons dans `expo-secure-store` (Keychain/Keystore), jamais dans AsyncStorage (M9) ;
  HTTPS uniquement et certificate pinning (M5) ; aucune clé dans le code ni dans `app.json` (M1) ;
  APK de release analysé avec MobSF (M7).
