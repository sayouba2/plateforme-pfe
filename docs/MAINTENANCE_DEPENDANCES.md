# Maintenance des dépendances

La politique est définie dans [dependabot.yml](../.github/dependabot.yml). Les mises à jour
ordinaires sont proposées chaque semaine vers `develop`. Chaque PR passe la CI complète et
nécessite une relecture avant fusion ; une promotion de `develop` vers `main` suit le même circuit.

## Mises à jour courantes

Les versions correctives et mineures restent dans les contraintes déclarées par le projet.
Pour Python et npm, `versioning-strategy: lockfile-only` empêche Dependabot de modifier les
manifestes pour élargir ces contraintes. `allow.update-types` exclut les migrations majeures
des propositions ordinaires, y compris pour les paquets Python sans borne supérieure.
Les mises à jour éligibles sont regroupées par composant, avec au plus cinq PR de version
ouvertes par configuration. Les groupes sont explicitement réservés à `version-updates`.

| Composant | Maintenance proposée | Migration dédiée |
| --- | --- | --- |
| Django | Correctifs `5.2.x`, grâce à `django>=5.2,<5.3`, dans une PR distincte | Changement de série LTS, avec mise à jour de la décision D1 |
| Autres dépendances Python | Correctifs et mineures compatibles avec les contraintes, regroupés | Version majeure ou élargissement nécessaire du manifeste |
| Web | Un groupe React/React DOM/types et un groupe d'outils, dans les plages de `package.json` | Changement de version majeure ; changement de série TypeScript ou Node.js/types coordonné |
| Mobile | Un groupe Expo et un groupe d'outils, dans les plages de `package.json` | Changement de SDK ou de version exacte de React/React Native, via la procédure Expo |
| Image Python | Correctifs de la série 3.13 | Changement de runtime, aligné avec la CI et `requires-python` |
| GitHub Actions | Correctifs et mineures regroupés ; références conservées sous forme de SHA | Nouvelle version majeure, avec vérification des permissions et du runner requis |

Les versions exactes de React et React Native dans le mobile n'ont aucune marge de mise à jour
dans le fichier de verrouillage : même un correctif de ces versions exige la procédure Expo.
Le groupe Expo facilite la relecture ; la compatibilité est vérifiée par `expo install --check`
et par les builds. Un numéro de version mineure ne garantit pas à lui seul la compatibilité.

Les tags Docker comme `python:3.13-slim` peuvent recevoir de nouveaux correctifs sans changer
de nom. Les reconstructions et le scan Trivy restent nécessaires, même sans PR Dependabot.
Les versions d'outils écrites dans les commandes du workflow ou du Dockerfile doivent aussi
être revues lors de la maintenance : cette configuration Dependabot ne les couvre pas toutes.

## Correctifs de sécurité

Les alertes et les propositions de correctifs de sécurité ont été activées dans les paramètres
GitHub du dépôt le 10 octobre 2026. Ce sont des paramètres du dépôt, distincts du fichier YAML.
Leur état reste vérifiable dans **Settings → Advanced Security**.

Les blocs de maintenance conservent `target-branch: develop` : selon la documentation GitHub,
ces options concernent les mises à jour de version, tandis que les correctifs de sécurité
utilisent la branche par défaut, actuellement `develop`. Le filtre `allow.update-types` ne
s'applique pas aux correctifs de sécurité. La fréquence hebdomadaire concerne la maintenance
ordinaire ; elle ne sert pas à retarder le traitement d'une vulnérabilité.

Une proposition de sécurité peut donc nécessiter de modifier un manifeste, de sortir d'une
série courante ou de mettre à jour une dépendance transitive. Elle est traitée en priorité,
avec analyse de l'avis de sécurité, vérification de compatibilité et CI complète. Si le
correctif requiert une migration, celle-ci fait l'objet d'une PR dédiée et documentée.
La disponibilité d'une PR dépend de l'existence d'un correctif et de la résolution des dépendances.

Cette politique n'ajoute aucune exclusion d'avis de sécurité ni aucun contournement d'audit.
Une alerte sans correctif compatible conserve son suivi ; les contrôles de sécurité restent
bloquants selon leurs seuils. Fermer une PR de version devenue hors politique ne résout pas
une vulnérabilité et ne justifie pas de fermer son alerte.

## Traiter une PR et préparer une migration

1. Identifier si la PR traite un avis de sécurité ou une mise à jour de maintenance. Examiner
   les notes de version, les dépendances transitives et le diff des fichiers de verrouillage.
2. Pour une migration, créer une issue et une branche depuis `develop`. Décrire le motif,
   les incompatibilités, les adaptations attendues et le retour arrière éventuel, notamment
   si les migrations de données ne sont pas réversibles.
3. Modifier le manifeste et régénérer son verrouillage avec `uv` ou `npm`. Garder ces fichiers
   ensemble dans la PR. Pour Django, rester en 5.2 LTS tant que la décision D1 n'est pas révisée.
4. Pour le mobile, suivre la migration Expo SDK par SDK : installer le SDK cible, exécuter
   `npx expo install --fix`, puis `npx expo-doctor`. Vérifier `npm run check:dependencies`, les
   builds et les parcours sur appareil/émulateur. Une simple PR isolée de React Native ne
   constitue pas une migration Expo validée.
5. Exécuter les contrôles locaux pertinents, faire passer la CI complète, puis obtenir la
   relecture requise. Une fois validée dans `develop`, promouvoir la mise à jour vers `main`.

La politique prend effet lorsque sa PR est fusionnée dans `develop`, la branche par défaut.
Les PR Dependabot déjà ouvertes doivent être revues après cette activation ; leur fermeture
éventuelle se décide en distinguant migration hors politique et correctif de sécurité.

## Références

- [Options Dependabot : allow, groups, target-branch et versioning-strategy](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
- [Filtrer les types de mises à jour sans filtrer les correctifs de sécurité](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/controlling-dependencies-updated#allowing-specific-semantic-versioning-levels-for-updates)
- [Procédure officielle de migration Expo](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
