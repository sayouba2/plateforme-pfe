# Livraison du produit et préparation à la production

Toutes les fonctionnalités du [PRD](PRD.md) font partie du produit cible. Les phases définissent
l'ordre de travail ; une fonctionnalité tardive n'est pas facultative.

## État du socle

- Présents : configuration Django, sonde de santé, utilisateur personnalisé et migration initiale,
  permissions des cinq rôles, pagination bornée, configuration Redis, Docker Compose local,
  contrôles CI et services PostgreSQL/Redis de test ; client React/Vite initialisé en TypeScript,
  avec lint, compilation et audit npm en CI.
- Temporairement retiré : client Expo/React Native et ses dépendances vulnérables. Le code reste
  récupérable dans Git ; voir [le report du mobile](MOBILE_TEMPORAIRE.md).
- Spécifiés : règle des dix candidatures, matrice d'autorisations, protocole d'assistance IA,
  architecture de production et critères de livraison.
- À implémenter : endpoints métier et d'authentification, parcours web/mobile, MFA, journal d'audit,
  stockage documentaire, IA, reverse proxy, supervision et déploiement de production.
- Vérifiés localement : les 56 tests du socle réussissent avec PostgreSQL et Redis, selon le
  résultat transmis par le développeur le 10 octobre 2026.
- À vérifier par exécution : pipeline complète et déploiement sur l'environnement cible.
  La réussite des tests locaux ne constitue pas une preuve de réussite de ces étapes.

Les résultats disponibles et leurs limites figurent dans la
[vérification du socle](preuves/validation-socle.md) et la
[validation initiale des clients](preuves/validation-clients.md). Depuis le 12 octobre 2026,
la CI porte sur le web et le backend. Les vulnérabilités mobiles restent non résolues et empêchent
la réintégration du client ; une CI verte sur le périmètre actuel ne valide pas le mobile.

## P1 — Identité et recrutement

Modèle de classes, états et contrat d'API, puis inscription/validation des comptes, sessions web,
authentification mobile avec rotation/révocation, contrôles de rôle et de propriété, journal d'audit,
offres, candidatures et conventions. Le web est initialisé avec ses contrôles ; le mobile sera
réintégré avec ses contrôles après correction de ses dépendances.

Sortie : parcours recrutement/convention testé sur les deux clients ; tests de quota, doublons,
concurrence et accès croisés sur PostgreSQL ; aucun fichier personnel exposé publiquement.

## P2 — Suivi, évaluation et administration

Profils, tuteurs, affectations, rapports, commentaires, fiche entreprise, note académique,
consultation des évaluations, administration complète, MFA et récupération des comptes.

Sortie : parcours complet jusqu'au stage évalué, tests des réaffectations et de la double validation,
journalisation des actions sensibles et des accès administratifs.

## P3 — IA et industrialisation DevSecOps

Matching, RAG, alimentation documentaire, tests adverses et évaluation de la qualité des réponses.
Assistance IA au diagnostic selon [DEVSECOPS_IA.md](DEVSECOPS_IA.md), avec mesures comparatives.
Exécuter les six scénarios de détection puis correction et relier chaque risque applicable aux preuves.

Sortie : critères IA et sécurité validés, versions des modèles/prompts tracées, limites de ressources
et comportements en cas d'erreur testés ; aucune décision métier ou de fusion laissée au modèle.

## Préproduction et exploitation

Ces travaux avancent avec les phases fonctionnelles et bloquent la mise en production :

- Choisir l'hébergement, le domaine et les ressources ; déployer TLS, Nginx, réseaux privés,
  paramètres de production, stockage MinIO privé et cache partagé authentifié.
- Tester migrations et déploiement à partir d'une base neuve et d'une version précédente ; publier
  des images identifiées, vérifier leur intégrité, préparer le retour arrière.
- Activer métriques, alertes, centralisation des logs, rétention et gestion des incidents ; attribuer
  les responsabilités d'exploitation.
- Fixer disponibilité, RPO/RTO et politique de sauvegarde ; restaurer PostgreSQL **et** MinIO dans
  un environnement isolé et vérifier la cohérence des références aux fichiers.
- Implémenter les durées de conservation et la suppression, organiser les mises à jour de sécurité
  et vérifier les dépendances sur la durée.
- Exécuter tests de bout en bout web/mobile, charge, scans authentifiés, contrôle de configuration
  et analyse de l'APK de release. Conserver les preuves associées à la version livrée.

La mise en production intervient après satisfaction de la section 13 du PRD, relecture de la version
et validation des procédures d'exploitation. Une date académique ne supprime aucun de ces critères.
