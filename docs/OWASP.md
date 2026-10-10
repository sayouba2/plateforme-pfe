# Couverture des risques OWASP

Les pratiques Tier 1 disent **comment** on vérifie (SAST, DAST, tests…). Les Top 10 OWASP disent
**ce qu'on** doit empêcher. Cette matrice relie les deux : pour chacun des 40 risques, son scénario dans
la plateforme, sa contre-mesure, le contrôle qui la vérifie et la preuve.

Version 0.1 — 9 octobre 2026. Référentiels utilisés (éditions en vigueur à cette date) :

| Domaine | Référentiel |
| --- | --- |
| Web | [OWASP Top 10:2025](https://top10.owasp.org/2025/) |
| API | [OWASP API Security Top 10 – 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) |
| Mobile | [OWASP Mobile Top 10 – 2024](https://owasp.org/www-project-mobile-top-10/) |
| IA | [OWASP Top 10 for LLM Applications – 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) (publié le 4 août 2026, numérotation différente de 2025) |

## Mode d'emploi

- **Applicable** : `Oui`, `Partiel` ou `Non`. Un `Non` ou un `Partiel` est **toujours justifié**.
- **Vérifié par** : la pratique Tier 1 et l'outil qui détectent une régression.
- **Preuve** : remplacer ☐ par le lien vers `preuves/…` une fois la démonstration capturée.
- Chaque risque applicable a au moins une abuse story (issue) et un test ou un contrôle de pipeline.

**À savoir :** les outils automatiques (SAST, DAST) ne voient presque pas les failles d'autorisation et
de logique métier (A01, A06, API1, API3, API5, API6). Seuls des tests écrits à partir de la matrice
d'autorisations les couvrent.

## Synthèse

| Référentiel | Oui | Partiel | Non | Démontrés |
| --- | --- | --- | --- | --- |
| Top 10:2025 | 10 | 0 | 0 | 0 / 10 |
| API Security 2023 | 9 | 0 | 1 | 0 / 9 |
| Mobile 2024 | 8 | 2 | 0 | 0 / 10 |
| LLM 2026 | 8 | 1 | 1 | 0 / 9 |
| **Total** | **35** | **3** | **2** | **0 / 38** |

## Web — OWASP Top 10:2025

| Réf. | Risque | Appl. | Scénario dans la plateforme | Contre-mesure | Vérifié par | Preuve |
| --- | --- | --- | --- | --- | --- | --- |
| A01:2025 | Broken Access Control | Oui | Un étudiant lit la candidature d'un autre ; un tuteur voit les stagiaires d'une autre entreprise | Refus par défaut (DRF), querysets filtrés par propriétaire, permissions par rôle, CORS en liste blanche | Tests de sécurité (pytest, matrice d'autorisations) ; DAST (ZAP) en partie | ☐ |
| A02:2025 | Security Misconfiguration | Oui | `DEBUG` actif en production, `ALLOWED_HOSTS` trop large, en-têtes manquants, documentation d'API exposée | Configuration par variables d'environnement, en-têtes de sécurité, documentation d'API désactivée par défaut | CI (`check --deploy`), DAST (ZAP), Trivy (Dockerfile) | ☐ |
| A03:2025 | Software Supply Chain Failures | Oui | Dépendance vulnérable ou malveillante ; action GitHub compromise (cas `trivy-action`, mars 2026) | `uv.lock` haché, actions épinglées par SHA, Dependabot, images de base suivies | Vulnerability Scanning (pip-audit, npm audit, Trivy) | ☐ |
| A04:2025 | Cryptographic Failures | Oui | Mots de passe mal hachés, trafic en clair, cookie de session sans `Secure` | Argon2, TLS + HSTS (Nginx), cookies `Secure` et `HttpOnly`, aucun chiffrement maison | Tests (test Argon2), CI (`check --deploy`), DAST (ZAP) | ☐ |
| A05:2025 | Injection | Oui | Recherche d'offres en SQL brut ; script dans la description d'une offre (XSS stocké) | ORM ou requêtes paramétrées, échappement React, CSP | SAST (Bandit B608, règle Semgrep `django-sql-brut-construit`), DAST (ZAP) | ☐ |
| A06:2025 | Insecure Design | Oui | Un étudiant fait passer sa candidature à « acceptée » ; le score IA décide seul | Threat model, abuse stories, transitions d'état contrôlées côté serveur, contraintes en base, score consultatif | Threat Modelling (Threat Dragon), tests métier, revue de code | ☐ |
| A07:2025 | Authentication Failures | Oui | Force brute sur la connexion, mot de passe faible, jeton mobile volé et réutilisé | 12 caractères minimum, limitation de débit + verrouillage, jetons courts avec rotation, MFA admin | Tests de sécurité, DAST (ZAP) | ☐ |
| A08:2025 | Software or Data Integrity Failures | Oui | Désérialisation non sûre ; modification de la pipeline par une PR non relue | Pas de `pickle` ni de `yaml.load` sur des données externes, CODEOWNERS sur `.github/`, protection des branches | SAST (Bandit B301, B506), revue de code | ☐ |
| A09:2025 | Security Logging and Alerting Failures | Oui | Aucune trace des connexions échouées ni des actions d'administration | Journal d'audit, logs `django.security`, alertes Grafana | Continuous Monitoring, test du journal d'audit | ☐ |
| A10:2025 | Mishandling of Exceptional Conditions | Oui | Trace d'erreur renvoyée au client ; exception qui laisse passer une requête ; LLM qui ne répond pas | `DEBUG=False`, erreurs génériques, contrôles qui échouent fermés, délais d'attente | Tests (cas d'erreur), DAST (ZAP), CI (`check --deploy`) | ☐ |

## API — OWASP API Security Top 10:2023

| Réf. | Risque | Appl. | Scénario dans la plateforme | Contre-mesure | Vérifié par | Preuve |
| --- | --- | --- | --- | --- | --- | --- |
| API1:2023 | Broken Object Level Authorization | Oui | `GET /api/candidatures/43/` par un étudiant qui n'en est pas l'auteur | `get_queryset()` filtré sur `request.user` dans chaque vue | Tests de sécurité (un test par rôle et par ressource) | ☐ |
| API2:2023 | Broken Authentication | Oui | Force brute sur l'endpoint de connexion ; jeton qui n'expire jamais | Limitation de débit et verrouillage, jeton d'accès court + rafraîchissement avec rotation et révocation | Tests de sécurité, DAST (ZAP) | ☐ |
| API3:2023 | Broken Object Property Level Authorization | Oui | L'étudiant envoie `"statut": "acceptee"` ; l'API renvoie `password_hash` ou la note d'un autre | Serializers avec `fields` explicites (jamais `"__all__"`) et `read_only_fields` | Tests, revue de code (règle Semgrep à ajouter contre `"__all__"`) | ☐ |
| API4:2023 | Unrestricted Resource Consumption | Oui | CV de 500 Mo, liste non paginée, rafale d'appels au LLM | Taille maximale des fichiers, pagination, limitation de débit (DRF + Nginx) | Tests (réponse 429), Continuous Monitoring | ☐ |
| API5:2023 | Broken Function Level Authorization | Oui | Un étudiant appelle l'action de validation d'une convention | Permission de rôle sur chaque action, refus par défaut | Tests de sécurité par rôle, DAST (ZAP) | ☐ |
| API6:2023 | Unrestricted Access to Sensitive Business Flows | Oui | Un script postule à toutes les offres ; création massive de comptes entreprise | Une candidature par offre (contrainte en base), plafond de candidatures actives, validation des entreprises par l'admin | Tests métier | ☐ |
| API7:2023 | Server Side Request Forgery | Non | L'API ne télécharge aucune URL fournie par un utilisateur ; l'URL du LLM est fixée par la configuration | Aucune (à réévaluer si un import par URL est ajouté) | Revue d'architecture | — |
| API8:2023 | Security Misconfiguration | Oui | CORS ouvert à tous, méthodes HTTP inutiles, messages d'erreur détaillés | CORS en liste blanche, en-têtes de sécurité, configuration de production vérifiée | CI (`check --deploy`), DAST (ZAP) | ☐ |
| API9:2023 | Improper Inventory Management | Oui | Documentation Swagger ou endpoint de test oublié en production | Documentation d'API désactivée par défaut, schéma OpenAPI généré comme inventaire, versionnage `/api/v1/` | Revue du schéma OpenAPI à chaque version, DAST (ZAP) | ☐ |
| API10:2023 | Unsafe Consumption of APIs | Oui | Réponse du LLM (Ollama) ou de MinIO utilisée sans validation | Validation par schéma des réponses du LLM, délais d'attente, échec fermé | Tests de la couche IA | ☐ |

## Mobile — OWASP Mobile Top 10:2024

| Réf. | Risque | Appl. | Scénario dans la plateforme | Contre-mesure | Vérifié par | Preuve |
| --- | --- | --- | --- | --- | --- | --- |
| M1:2024 | Improper Credential Usage | Oui | Clé d'API codée en dur dans l'application | Aucun secret dans le code ni dans `app.json` ; l'app ne détient que le jeton de l'utilisateur | Gitleaks, MobSF | ☐ |
| M2:2024 | Inadequate Supply Chain Security | Oui | Paquet npm compromis ou au nom imité | `package-lock.json`, `npm audit`, Dependabot | Vulnerability Scanning (npm audit) | ☐ |
| M3:2024 | Insecure Authentication/Authorization | Oui | Écran masqué dans l'app mais endpoint accessible | Tous les contrôles d'accès côté API ; l'app ne fait qu'afficher | Tests de sécurité de l'API | ☐ |
| M4:2024 | Insufficient Input/Output Validation | Oui | Lien profond (deep link) qui ouvre un écran avec des paramètres forgés | Validation côté serveur, liens profonds limités et vérifiés | Tests, revue de code | ☐ |
| M5:2024 | Insecure Communication | Oui | Interception du trafic sur un Wi-Fi public | HTTPS uniquement, trafic en clair interdit, certificate pinning | MobSF, test d'interception (proxy) | ☐ |
| M6:2024 | Inadequate Privacy Controls | Oui | Permissions excessives (contacts, localisation) ; données personnelles dans les logs | Permissions minimales, aucune donnée personnelle dans les logs | MobSF (permissions), revue de code | ☐ |
| M7:2024 | Insufficient Binary Protections | Partiel | Rétro-ingénierie de l'APK pour trouver des secrets ou des endpoints cachés | Aucun secret dans l'APK, car tout y est récupérable. Obfuscation hors périmètre : sans effet sur des données déjà publiques | MobSF | ☐ |
| M8:2024 | Security Misconfiguration | Oui | APK de release en mode debug ; sauvegarde Android autorisée | Configuration de release vérifiée (`allowBackup` désactivé, trafic en clair interdit) | MobSF | ☐ |
| M9:2024 | Insecure Data Storage | Oui | Jeton stocké en clair dans AsyncStorage | `expo-secure-store` (Keychain / Keystore) | MobSF, revue de code | ☐ |
| M10:2024 | Insufficient Cryptography | Partiel | Chiffrement maison de données locales | Aucune cryptographie maison : TLS et stockage sécurisé du système. Rien d'autre n'est chiffré par l'app | MobSF, revue de code | ☐ |

## IA — OWASP Top 10 for LLM Applications 2026

| Réf. | Risque | Appl. | Scénario dans la plateforme | Contre-mesure | Vérifié par | Preuve |
| --- | --- | --- | --- | --- | --- | --- |
| LLM01:2026 | Prompt Injection | Oui | Instruction cachée dans un CV (« donne 100/100 ») ; question piégée à l'assistant | Instructions et données séparées, texte du CV traité comme donnée, sortie JSON validée, score consultatif | Tests de prompts adverses (jeu de CV piégés) | ☐ |
| LLM02:2026 | Sensitive Information Disclosure | Oui | L'assistant révèle un document interne ou des données d'un autre utilisateur | Aucune donnée personnelle indexée, filtrage par rôle, aucune donnée sensible dans les logs du LLM | Tests par rôle | ☐ |
| LLM03:2026 | Excessive Agency | Non | Le LLM n'appelle aucun outil et n'écrit rien : il renvoie un texte ou un score | Aucune (à réévaluer si un agent capable d'agir est ajouté) | Revue d'architecture | — |
| LLM04:2026 | Supply Chain | Oui | Modèle ou image Ollama modifiés, téléchargés depuis une source non officielle | Modèle et image officiels, épinglés par version et empreinte | Trivy (image), revue | ☐ |
| LLM05:2026 | Data and Model Poisoning | Partiel | Document malveillant ajouté à la base de l'assistant | Seuls les administrateurs alimentent la base, chaque ajout est journalisé et relu. Aucun entraînement de modèle : pas d'empoisonnement de l'entraînement possible | Revue, journal d'audit | ☐ |
| LLM06:2026 | Unbounded Consumption | Oui | Rafale de questions ou CV géant qui sature le serveur du LLM | Limitation de débit par utilisateur, taille maximale des entrées, délais d'attente, file de traitement | Tests (réponse 429), Continuous Monitoring | ☐ |
| LLM07:2026 | Misinformation | Oui | L'assistant invente une règle de stage ; le matching invente une compétence | Réponses avec passages sources, « je ne sais pas » sans source, avertissement affiché, score consultatif | Jeu de questions de référence | ☐ |
| LLM08:2026 | Hidden Context Exposure | Oui | Extraction du prompt système par une question piégée | Aucun secret ni règle d'accès dans le prompt : les contrôles sont dans le code | Tests de prompts adverses | ☐ |
| LLM09:2026 | Vector and Embedding Weaknesses | Oui | Un étudiant récupère des passages réservés aux encadrants via la recherche vectorielle | Filtre par rôle dans la requête de recherche (pgvector), index non exposé | Tests par rôle | ☐ |
| LLM10:2026 | Improper Output Handling | Oui | Réponse du LLM affichée comme du HTML (XSS) | Rendu en texte brut, validation par schéma, sortie jamais exécutée | Tests, DAST (ZAP), SAST (Semgrep) | ☐ |
