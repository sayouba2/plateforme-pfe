# PRD — Plateforme de gestion des stages / PFE

Ce document décrit **quoi** construire et **pourquoi**. Le **comment** est dans
[ARCHITECTURE.md](ARCHITECTURE.md), les règles de développement dans [RULES.md](RULES.md) et la
couverture des risques dans [OWASP.md](OWASP.md).

Version 0.2 — 9 octobre 2026. Toute modification passe par une PR relue.

## 1. Contexte

Projet 5 du module « Sécurité des applications et des services » (FST Marrakech, IRISI 3) : une
pipeline DevSecOps augmentée par IA pour l'écosystème Python, démontrée sur une application réelle.

La plateforme est un produit destiné à une **mise en production à la fin du développement**.
Le cadre académique exige en parallèle une démarche de cybersécurité vérifiable : automatisation
des contrôles, tests et preuves de leur efficacité. Les fonctionnalités ci-dessous constituent le
périmètre cible complet ; les phases organisent leur livraison sans rendre des exigences facultatives.

Depuis le 12 octobre 2026, le client mobile est [temporairement retiré du socle](MOBILE_TEMPORAIRE.md)
en attendant les correctifs de ses dépendances. Les exigences mobiles ci-dessous restent celles du
produit cible ; le périmètre actuellement vérifié en CI est limité au web et au backend.

## 2. Problème et objectif

Aujourd'hui, le suivi des stages passe par des e-mails, des documents papier et des tableurs : offres
dispersées, conventions validées en retard, encadrants sans visibilité, et des documents sensibles (CV,
rapports, notes) échangés sans contrôle d'accès.

**Objectif :** une plateforme unique qui couvre le cycle d'un stage (offre → candidature → convention →
suivi → évaluation), où chaque utilisateur n'accède qu'aux données qui le concernent.

## 3. Utilisateurs

| Rôle | Qui | Canal | Besoin principal | Ne voit que |
| --- | --- | --- | --- | --- |
| Visiteur | Personne non connectée | Web, mobile | Créer un compte, se connecter | Les pages d'inscription et de connexion |
| Étudiant | Étudiant de la FST | Mobile (principal), web | Trouver un stage, postuler, suivre son stage | Ses candidatures, ses rapports, ses évaluations |
| Responsable entreprise | RH ou manager | Web | Publier des offres, recruter | Ses offres et les candidatures reçues sur ses offres |
| Tuteur entreprise | Ingénieur qui encadre le stagiaire | Web | Suivre et évaluer son stagiaire | Les stagiaires qui lui sont affectés |
| Encadrant académique | Enseignant de la FST | Web | Suivre, commenter, noter | Les étudiants qui lui sont affectés |
| Administrateur | Service des stages de la FST | Web | Valider, affecter, administrer | Tout, avec traçabilité de chaque action |

## 4. Périmètre du produit et phases de livraison

**P1** = identité, recrutement et conventions · **P2** = suivi, évaluation et administration complète ·
**P3** = fonctionnalités IA. Toutes les lignes sont attendues avant la mise en production.
Chaque ligne devient une user story (issue GitHub) avec ses critères de sécurité. La préparation à
l'exploitation et les critères de passage en production sont décrits dans [ROADMAP.md](ROADMAP.md).

| ID | Fonctionnalité | Rôle | Phase |
| --- | --- | --- | --- |
| F01 | Créer un compte étudiant (e-mail institutionnel) ou entreprise (validé ensuite par l'admin) | Visiteur | P1 |
| F02 | S'authentifier et se déconnecter (web : session ; mobile : jeton) | Tous | P1 |
| F03 | Gérer son profil | Tous | P2 |
| F04 | Interroger l'assistant réglementaire (RAG) — **IA** | Tous | P3 |
| F10 | Rechercher des offres | Étudiant | P1 |
| F11 | Postuler à une offre avec son CV | Étudiant | P1 |
| F12 | Suivre ses candidatures | Étudiant | P1 |
| F13 | Déposer un rapport d'avancement ou final | Étudiant | P2 |
| F14 | Consulter son évaluation | Étudiant | P2 |
| F20 | Gérer ses offres de stage | Responsable entreprise | P1 |
| F21 | Examiner les candidatures reçues | Responsable entreprise | P1 |
| F22 | Obtenir un score de compatibilité CV ↔ offre — **IA** | Responsable entreprise | P3 |
| F23 | Accepter ou refuser une candidature | Responsable entreprise | P1 |
| F24 | Approuver la convention | Responsable entreprise | P1 |
| F25 | Créer des comptes tuteurs et les affecter aux stagiaires | Responsable entreprise | P2 |
| F30 | Suivre ses stagiaires (rapports, avancement) | Tuteur, Encadrant | P2 |
| F31 | Commenter un rapport | Tuteur, Encadrant | P2 |
| F32 | Évaluer le stagiaire (fiche entreprise) | Tuteur | P2 |
| F33 | Noter le rapport final | Encadrant | P2 |
| F40 | Valider les comptes entreprise | Administrateur | P1 |
| F41 | Valider les conventions | Administrateur | P1 |
| F42 | Affecter un encadrant académique | Administrateur | P2 |
| F43 | Gérer les utilisateurs (désactiver, réinitialiser) | Administrateur | P2 |
| F44 | Gérer la base documentaire de l'assistant | Administrateur | P3 |
| F45 | Consulter le journal d'audit | Administrateur | P1 |

Chaque phase doit être intégrée et testée. La fin d'une phase ne vaut pas autorisation de mise en
production : les critères de la section 13 s'appliquent à l'ensemble du produit.

## 5. Cycle de vie

Seules ces transitions existent, et chacune est réservée à un rôle (voir la matrice d'autorisations
dans `conception/`). Toute autre transition est refusée par l'API.

| Objet | Transition | Déclenchée par |
| --- | --- | --- |
| Candidature | soumise → retirée | Étudiant (sa candidature) |
| Candidature | soumise → acceptée ou refusée | Responsable entreprise (offre de son entreprise) |
| Convention | générée (à l'acceptation) → approuvée | Responsable entreprise |
| Convention | approuvée → validée ou rejetée | Administrateur |
| Stage | en cours (convention validée) → terminé | Dépôt du rapport final par l'étudiant |
| Stage | terminé → évalué | Note de l'encadrant + fiche du tuteur |

Exemple de règle de sécurité qui en découle : un étudiant ne peut jamais faire passer sa candidature à
« acceptée », même en envoyant ce statut à l'API.

## 6. Règles métier

| ID | Règle | Risque couvert |
| --- | --- | --- |
| R1 | Une seule candidature par étudiant et par offre (contrainte en base) | API6 |
| R2 | Au plus 10 candidatures actives par étudiant ; seule une candidature au statut `soumise` est active | API6, API4 |
| R3 | Un compte entreprise reste inactif, et ses offres non publiées, tant que l'admin ne l'a pas validé | API6 |
| R4 | Un tuteur appartient à une seule entreprise et ne voit que ses stagiaires | API1 |
| R5 | Un encadrant ne voit que les étudiants qui lui sont affectés | API1 |
| R6 | Le score IA est consultatif : affiché avec sa justification, jamais utilisé pour décider seul | LLM01, LLM07 |
| R7 | CV et rapports : PDF de 5 Mo maximum (type réel vérifié), accessibles aux seuls rôles autorisés | API4, A01 |
| R8 | Les offres ne sont visibles que par les utilisateurs connectés | API6 |
| R9 | Toute action d'administration (validation, affectation, désactivation) est journalisée | A09 |

**Précisions sur les candidatures et la concurrence**
- Les candidatures acceptées, refusées ou retirées ne comptent plus dans le plafond de 10.
- Retirer ou refuser une candidature ne supprime pas son historique ; R1 interdit de créer une
  deuxième candidature pour le même couple étudiant/offre, quel que soit le statut de la première.
- Le serveur fixe l'étudiant et le statut initial. Le contrôle du quota et la création sont effectués
  dans une même transaction, avec verrouillage de la ligne de l'étudiant. Deux soumissions
  simultanées à partir de neuf candidatures actives donnent exactement un succès et un refus.
- L'acceptation et la création de la convention sont atomiques. Une deuxième acceptation concurrente
  ne crée jamais une deuxième convention. Toute transition depuis un état final est refusée.
- Le stage devient `évalué` lorsque la note académique **et** la fiche du tuteur sont présentes.
  La création et l'affectation des tuteurs (F25), ainsi que leur évaluation (F32), font partie du produit.
- L'accès dépend toujours du rôle, du périmètre et de l'état : voir la
  [matrice d'autorisations](conception/matrice-autorisations.md).

## 7. Fonctionnalités IA

Les deux fonctionnalités utilisent un **LLM local** (Ollama) : aucune donnée personnelle n'est envoyée
à un service externe.

**F22 — Score de compatibilité CV ↔ offre**
- Entrée : texte extrait du CV et description de l'offre.
- Sortie : score de 0 à 100, points forts, compétences manquantes, au format JSON.
- Garde-fous : le texte du CV est une donnée non fiable (jamais une instruction) ; la sortie est
  validée par un schéma, sinon rejetée ; le score reste consultatif (R6) ; débit limité par utilisateur.

**F04 — Assistant réglementaire (RAG)**
- Sources : règlement des stages et guides de la FST, filtrés par rôle avant la recherche.
- Sortie : réponse avec les passages cités ; « je ne sais pas » si aucune source ne répond.
- Garde-fous : aucune donnée personnelle indexée ; seuls les administrateurs alimentent la base (F44) ;
  taille des questions et débit limités.

## 8. Exigences non fonctionnelles

**Sécurité**
- Vérification : OWASP ASVS 5.0 niveau 2 (web, API) et OWASP MASVS 2.1 (mobile).
- Risques : les 4 référentiels OWASP imposés, analysés ligne par ligne dans [OWASP.md](OWASP.md).
- Pipeline : les 11 pratiques DevSecOps Tier 1 automatisées et démontrées (voir le README).
- Authentification : 12 caractères minimum, hachage Argon2, MFA obligatoire pour les administrateurs
  avant la mise en production ; récupération et révocation des accès documentées.
- Transport : TLS partout (Nginx), HSTS.

**Données personnelles** (CV, notes, coordonnées)
- Principes de la loi marocaine 09-08 : finalité déclarée, minimisation, durée de conservation définie.
- Données de développement et de démonstration fictives uniquement.

**Performance** (cibles à mesurer, chapitre « impact de la pipeline » du rapport)
- Pipeline sur une PR : moins de 15 minutes.
- Réponse de l'API hors IA : moins de 500 ms.
- Score IA : moins de 30 secondes, sinon traitement asynchrone.

**Plateformes cibles** : navigateurs récents et Android (application de release). La prise en charge
d'iOS reste une extension hors de cette première version de production.

## 9. Hors périmètre

- Messagerie temps réel, notifications push, calendrier.
- Paiement de gratifications.
- Signature électronique à valeur légale (l'approbation se fait dans l'application).
- Plusieurs établissements.
- Import de CV depuis une URL ou LinkedIn : exclu aussi parce qu'il ouvrirait un risque SSRF (API7).

## 10. Contraintes du cahier des charges

- Un front-end web, une application mobile, des API REST et un back-end métier.
- Les 11 pratiques Tier 1 de Prates & Pereira (2025) : obligatoires et démontrées en soutenance.
  Les pratiques Tier 2 réellement intégrées donnent un bonus.
- Les risques des 4 référentiels OWASP pris en compte.
- Des preuves pour chaque mécanisme : pratique → outil → intégration → détection → résultat → correction.
- Le code produit avec une IA est vérifié, testé et compris ; aucune donnée sensible n'est donnée à
  un outil d'IA.
- Livrables : rapport technique, présentation et démonstration, code et fichiers de déploiement,
  documents complémentaires (diagrammes, threat model, résultats des outils, scripts de tests,
  captures, documentation d'installation).

## 11. Critères de réussite

1. Le parcours complet est démontré : offre → candidature → convention → suivi → note.
2. Six commits piégés sont bloqués par la pipeline puis corrigés : secret codé en dur, dépendance
   vulnérable, SQL injectable, endpoint sans contrôle du propriétaire, Dockerfile en root, prompt
   non protégé.
3. Les 40 risques OWASP sont analysés ; chaque risque applicable est relié à une preuve.
4. L'impact de la pipeline et de l'assistance IA au diagnostic est mesuré selon le
   [protocole DevSecOps IA](DEVSECOPS_IA.md) : durée des contrôles, temps de diagnostic et de correction,
   qualité des corrections. Les contrôles bloquants sont identiques avec et sans assistance.

## 12. Questions ouvertes

- [ ] Date de soutenance (pour caler les sprints).
- [ ] Hébergement de production, domaine, certificats et responsable d'exploitation.
- [ ] Domaine de l'e-mail institutionnel des étudiants (F01):@uca.ac.ma
- [x] Plafond de candidatures actives (R2) : 10 candidatures actives maximum par étudiant.
- [ ] Durée de conservation des données : 5 ans.
- [ ] Base vectorielle du RAG : pgvector (recommandé) ou ChromaDB.
- [ ] Méthode de MFA pour les administrateurs (TOTP ?).

## 13. Conditions de mise en production

- Toutes les fonctionnalités des phases P1 à P3 sont livrées avec leurs critères d'acceptation.
- La matrice d'autorisations est couverte par des tests sur PostgreSQL, dont les refus, les
  accès à un autre propriétaire et les transitions concurrentes ; les scans DAST sont authentifiés.
- Authentification web/mobile, MFA administrateur, expiration/révocation des sessions et jetons,
  validation des comptes et journal d'audit sont opérationnels et testés.
- TLS, en-têtes de sécurité, cache partagé, stockage privé, limites de ressources et isolation réseau
  sont déployés ; `check --deploy` et la pipeline passent sur la configuration de livraison.
- Sauvegardes PostgreSQL et MinIO, restauration testée, supervision, alertes et procédure de retour
  arrière sont en place ; un responsable d'exploitation et un circuit de traitement des incidents
  sont identifiés.
- Conservation et suppression des données sont définies et implémentées ; les essais utilisent
  uniquement des données fictives. Les cibles de disponibilité, RPO et RTO sont arrêtées et testées.
- L'application Android de release a été analysée avec MobSF ; les parcours web/mobile complets
  et les objectifs de performance ont été vérifiés en préproduction.

Une exigence non satisfaite reste un point bloquant de livraison ; elle n'est pas retirée pour
respecter une échéance de soutenance.
