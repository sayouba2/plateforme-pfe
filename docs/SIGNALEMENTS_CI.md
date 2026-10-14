# Signalements des échecs CI

Le job « Ticket de sécurité » s'exécute après un échec sur un push ou un scan planifié de
`main` ou `develop`. Il n'écrit aucune issue pour les PR ni pour les déclenchements manuels.
Les scripts se trouvent dans [.github/scripts](../.github/scripts/).

## Une identité par problème

| Origine de l'échec | Identité du signalement |
| --- | --- |
| npm audit | Outil, paquet et avis GHSA de sévérité haute ou critique |
| Trivy, image | Outil, type de paquet, paquet et identifiant de vulnérabilité bloquante |
| Trivy, Dockerfile | Outil, type de configuration, fichier et identifiant de règle bloquante |
| Autres contrôles ou rapport inexploitable | Nom du job et nom de l'étape en échec |

La branche, le commit, la version affectée et l'identifiant de l'exécution ne font pas partie
de cette identité. Deux avis différents du même paquet créent deux issues ; le même avis
retrouvé sur plusieurs branches ou versions complète la même issue.

Les alertes npm propagées aux dépendances parentes ne créent pas d'issues supplémentaires.
Les critères Trivy restent ceux du scan : sévérité haute ou critique et, pour les vulnérabilités
de l'image, correctif disponible (`--ignore-unfixed` déjà présent dans le workflow).
Les autres échecs restent des signalements de contrôles : leur regroupement ne prouve pas
qu'ils ont tous la même cause technique.

## Mise à jour et concurrence

Chaque issue automatique porte un marqueur `pfe-ci-issue:v1` dans son corps. Son titre peut être
modifié sans perdre la déduplication. Conserver ce marqueur et le label `security`.
La recherche parcourt les issues ouvertes et fermées via l'API paginée, sans dépendre de
l'indexation des titres. Seules les issues écrites par `github-actions[bot]` sont réutilisées.

Le corps conserve les branches sur lesquelles le problème a été observé. Un commentaire
ajoute le commit, l'exécution, sa tentative et les résultats de chaque nouvelle occurrence.
La reprise du même signalement ne duplique pas ce commentaire. Une nouvelle tentative de CI
est une nouvelle occurrence. Une issue fermée est rouverte si le problème est détecté de nouveau.
Les notes humaines et le titre sont conservés.

Un groupe de concurrence commun aux branches sérialise la recherche et les écritures.
`queue: max` conserve jusqu'à 100 jobs en attente ; aucun signalement en cours n'est annulé
par ce groupe. La politique générale d'annulation des workflows d'une même branche demeure
applicable. Référence : [concurrence GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

Les branches affichées indiquent des détections historiques, pas une preuve de vulnérabilité
sur leur dernier commit. La clôture reste une décision de relecture après vérification des
branches concernées ; un seul run vert ne clôture jamais automatiquement une issue.

## Rapports et sécurité

Les rapports JSON npm et Trivy sont conservés pendant 14 jours, y compris après un échec.
Le nom des artefacts comprend la tentative du run ; le signalement consulte uniquement les
jobs et rapports de cette tentative. Des noms de fichiers distincts évitent les collisions
lors du téléchargement des rapports web et mobile.

Un rapport absent, invalide ou sans résultat interprétable produit un signalement du contrôle
en échec. Les erreurs brutes du registre, les logs et les rapports de secrets ne sont pas
recopiés dans les issues. Une erreur de lecture de l'API interrompt le signalement : elle ne
provoque pas de création d'issue sans avoir pu vérifier les issues existantes.

Les permissions du job sont limitées à la lecture du code et des exécutions et à l'écriture
des issues. Le script refuse les événements et branches hors périmètre. Les seuils d'audit,
les échecs des commandes et les protections de branches restent appliqués.

## Validation et activation

Les tests utilisent le module natif `node:test` et une API GitHub simulée. Ils couvrent les
avis distincts, la propagation npm, les critères Trivy, le regroupement entre branches et
commits, les reprises, la réouverture, les rapports manquants et le refus des PR.

```bash
node --test .github/scripts/*.test.cjs
```

Ils s'exécutent aussi dans le job obligatoire « Tests et contrôles Django ».
La logique doit être fusionnée dans `develop` puis promue vers `main` pour que les deux
branches utilisent le nouveau signalement.

Les issues historiques #1 et #2 regroupent plusieurs échecs et ne portent pas cette identité.
Elles ne sont ni clôturées ni réaffectées automatiquement : leurs vulnérabilités ne sont pas
corrigées par cette modification. Lors de la première détection avec le nouveau workflow,
relier ces tickets aux issues détaillées avant de clôturer les anciens comme doublons.
