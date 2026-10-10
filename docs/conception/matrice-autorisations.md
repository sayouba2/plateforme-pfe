# Matrice d'autorisations

Contrat de sécurité du produit cible, lié aux fonctionnalités du [PRD](../PRD.md).
Les endpoints métier restent à développer. Cette matrice est une spécification de leurs tests,
pas une attestation de couverture déjà obtenue.

## Principes communs

- Tout accès non indiqué est refusé, y compris pour un compte dont le rôle est inconnu ou désactivé.
- Le rôle, le propriétaire, l'entreprise et les affectations viennent des données du serveur.
  Un identifiant transmis par le client ne constitue jamais une autorisation.
- `403` pour une action interdite au rôle ; `404` pour un objet hors de son périmètre afin de ne
  pas révéler son existence ; `409` pour une transition incompatible, un doublon ou un quota atteint.
- Toutes les listes et tous les téléchargements suivent le même périmètre que la consultation unitaire.
- Les champs `role`, propriétaire, entreprise, affectations, statut et note sont protégés : aucune
  modification générique ne remplace une action métier dédiée.
- Le rôle administrateur dispose des consultations administratives tracées. Il ne peut pas
  postuler, accepter une candidature ou noter un rapport en se faisant passer pour un autre rôle.
- Les droits techniques Django (`is_staff`, `is_superuser`, permissions Django) sont distincts
  des actions métier. Aucun endpoint public ne permet de les attribuer.

## Légende

`Oui` : action autorisée dans le périmètre indiqué ; `Soi` : données personnelles du compte ;
`Offre` : offre gérée par ce responsable et rattachée à son entreprise ;
`Affecté` : stage explicitement affecté au tuteur ou à l'encadrant ;
`Admin` : consultation ou action d'administration journalisée ; `—` : refus.
Tous les comptes authentifiés doivent être actifs ; un responsable entreprise doit avoir été validé.

## Comptes et profils

| Action | Visiteur | Étudiant | Responsable | Tuteur | Encadrant | Administrateur |
| --- | --- | --- | --- | --- | --- | --- |
| Inscription étudiant / responsable (F01) | Oui | — | — | — | — | — |
| Connexion (F02) | Oui | Oui | Oui | Oui | Oui | Oui + MFA en production |
| Déconnexion, révocation de sa session (F02) | — | Soi | Soi | Soi | Soi | Soi |
| Lire / modifier les champs éditables du profil (F03) | — | Soi | Soi | Soi | Soi | Soi |
| Valider un compte entreprise (F40) | — | — | — | — | — | Admin |
| Créer un tuteur dans son entreprise (F25) | — | — | Oui | — | — | — |
| Désactiver / initier une réinitialisation (F43) | — | — | — | — | — | Admin |

L'inscription impose le rôle côté serveur selon le parcours choisi, vérifie la possession de
l'adresse e-mail et le domaine institutionnel étudiant. Le responsable reste inactif jusqu'à
validation administrative. Les comptes encadrant/administrateur sont provisionnés par un processus
administratif tracé. La réinitialisation ne communique jamais un mot de passe existant.
La désactivation révoque les sessions et rafraîchissements mobiles ; la politique des jetons d'accès
encore valides doit être couverte par les tests d'authentification.

## Offres, candidatures et conventions

| Action | Étudiant | Responsable | Tuteur | Encadrant | Administrateur |
| --- | --- | --- | --- | --- | --- |
| Rechercher / consulter les offres publiées (F10) | Oui | Oui | Oui | Oui | Oui |
| Consulter une offre non publiée (F20) | — | Offre | — | — | Admin |
| Créer / modifier / fermer une offre (F20) | — | Offre | — | — | — |
| Postuler avec un CV (F11) | Soi | — | — | — | — |
| Consulter / lister une candidature (F12, F21) | Soi | Offre | — | — | Admin |
| Retirer une candidature | Soi, si soumise | — | — | — | — |
| Accepter / refuser une candidature (F23) | — | Offre, si soumise | — | — | — |
| Télécharger le CV d'une candidature | Soi | Offre | Affecté, après création du stage | Affecté, après création du stage | Admin |
| Consulter une convention | Soi | Offre | Affecté | Affecté | Admin |
| Approuver une convention (F24) | — | Offre, si générée | — | — | — |
| Valider / rejeter une convention (F41) | — | — | — | — | Admin, si approuvée |

Les visiteurs n'ont accès à aucune de ces opérations. Une offre fermée ou non publiée refuse les
candidatures. Le CV se télécharge via l'API, après autorisation et journalisation, jamais via une URL
publique MinIO. R1 et R2 s'appliquent même si les requêtes proviennent simultanément du web et du mobile.

## Suivi et évaluation

| Action | Étudiant | Responsable | Tuteur | Encadrant | Administrateur |
| --- | --- | --- | --- | --- | --- |
| Consulter le stage (F30) | Soi | Offre, données de recrutement et affectation | Affecté | Affecté | Admin |
| Affecter un tuteur de la même entreprise (F25) | — | Offre | — | — | — |
| Affecter un encadrant académique (F42) | — | — | — | — | Admin |
| Déposer un rapport d'avancement ou final (F13) | Soi, stage en cours | — | — | — | — |
| Lire / télécharger un rapport (F30) | Soi | — | Affecté | Affecté | Admin |
| Commenter un rapport (F31) | — | — | Affecté | Affecté | — |
| Renseigner la fiche entreprise (F32) | — | — | Affecté, stage terminé | — | — |
| Noter le rapport final (F33) | — | — | — | Affecté, stage terminé | — |
| Consulter l'évaluation finalisée (F14) | Soi | — | Affecté | Affecté | Admin |

Le responsable entreprise consulte les informations nécessaires au recrutement et à l'affectation,
sans hériter de l'accès aux rapports ou aux notes du tuteur. Le dépôt du rapport final termine le stage.
La note et la fiche sont enregistrées une seule fois chacune ; leur deuxième enregistrement concurrent
est refusé. La dernière des deux validations fait passer le stage à `évalué` dans la même transaction.
Une éventuelle procédure de correction après validation devra être spécifiée, autorisée et auditée
avant d'être ajoutée. Une réaffectation retire immédiatement l'accès de l'ancien encadrant/tuteur.

## IA et audit

| Action | Étudiant | Responsable | Tuteur | Encadrant | Administrateur |
| --- | --- | --- | --- | --- | --- |
| Demander / lire un score de compatibilité (F22) | — | Offre | — | — | — |
| Interroger le RAG (F04) | Documents de son rôle | Documents de son rôle | Documents de son rôle | Documents de son rôle | Documents de son rôle |
| Ajouter / retirer / étiqueter un document RAG (F44) | — | — | — | — | Admin |
| Consulter le journal d'audit (F45) | — | — | — | — | Admin |

Les passages RAG sont filtrés avant récupération. Les sorties IA sont validées et affichées en texte
brut. Le score n'effectue aucune transition métier. La lecture administrative du journal est elle-même
tracée, et les événements ne contiennent ni secrets ni contenu de documents personnels.

## Cas à automatiser

| ID | Scénario | Résultat attendu | État |
| --- | --- | --- | --- |
| AUT-01 | Chaque permission de rôle × chacun des cinq rôles | Le seul rôle attendu passe ; les autres reçoivent 403 | Tests des permissions du socle réussis localement : `test_comptes.py` |
| AUT-02 | Compte désactivé ou anonyme sur chaque permission | Refus, même avec une identité injectée dans la requête de test | Tests des permissions du socle réussis localement |
| AUT-03 | Rôle inconnu / privilèges Django incohérents écrits directement en base | Contrainte SQL en échec | Tests réussis localement sur PostgreSQL |
| OBJ-01 | Lire, modifier, lister ou télécharger un objet d'un autre propriétaire | 404 ou absence dans la liste | À livrer avec chaque domaine métier |
| OBJ-02 | Tuteur/encadrant réaffecté ; stage d'une autre entreprise | Ancien accès refusé | À livrer avec les affectations |
| PROP-01 | Injection de rôle, propriétaire, entreprise, statut ou note dans un payload générique | Champs protégés ; aucune élévation de privilèges | À livrer avec les serializers |
| CAND-01 | Dix candidatures soumises, puis une onzième | Dix réussites puis 409 | À livrer avec F11 |
| CAND-02 | Deux soumissions simultanées à partir de neuf actives | Un seul succès ; dix actives en base | Test transactionnel PostgreSQL à livrer |
| CAND-03 | Deux candidatures pour la même offre, y compris après retrait | Contrainte d'unicité ; 409 explicite | À livrer avec F11 |
| ETAT-01 | Acceptation concurrente, double convention ou transition depuis un état final | Une seule transition et une seule convention | À livrer avec F23/F24/F41 |
| EVAL-01 | Note seule, fiche seule, puis les deux | `terminé`, `terminé`, puis `évalué` ; pas de double validation | À livrer avec F32/F33 |
| RAG-01 | Requête proche d'un fragment réservé à un autre rôle | Aucun fragment ni citation hors périmètre | À livrer avec F04 |

Les résultats AUT-01 à AUT-03 font partie des 56 tests réussis dans le terminal du développeur
le 10 octobre 2026 ; voir la [vérification du socle](../preuves/validation-socle.md).

Chaque ligne de la matrice métier devient un jeu paramétré : autorisé, autre rôle, autre propriétaire,
compte inactif et état incompatible lorsque ces dimensions existent. Une permission de rôle testée
sur une vue de test ne suffit pas à déclarer un endpoint métier sécurisé.
