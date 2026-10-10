# Initialisation des clients — 10 octobre 2026

Le web utilise React 19, Vite 8 et TypeScript à partir de `create-vite` 9.2.1. Le mobile utilise
le modèle officiel `expo-template-blank-typescript` 57.0.29, Expo 57.0.27 et React Native 0.86.3.
Le modèle mobile a été installé via npm puis copié, l'initialiseur ne pouvant pas le télécharger
directement dans cette session. Les dépendances de chaque application sont verrouillées dans
son `package-lock.json`.

Les deux écrans d'accueil sont en français. Ils présentent le projet sans données personnelles,
appel d'API ni authentification simulée. Les fonctionnalités du PRD restent à implémenter.

## Contrôles locaux

| Contrôle | Résultat |
| --- | --- |
| Web : ESLint, TypeScript et build Vite | Réussis ; fichiers statiques dans `web/dist/` |
| Web : audit npm | Aucune vulnérabilité signalée lors de l'installation |
| Mobile : ESLint 10 et TypeScript | Réussis |
| Mobile : export Expo | Bundles Hermes Android et iOS générés dans `mobile/dist/` |
| Mobile : versions Expo | Compatibles avec la carte locale `expo/bundledNativeModules.json` ; endpoint distant inaccessible dans cette session |
| Mobile : audit npm | Échec : vulnérabilités transitives, détail ci-dessous |
| Web : démarrage et rendu | Serveur Vite démarré ; accueil vérifié dans Chrome headless à 1 440 × 1 000 |
| Workflow et verrouillages | YAML, syntaxe bash des étapes et concordance des manifestes avec les locks vérifiés |

La CI utilise Node.js 24 LTS (`.nvmrc`). La vérification locale a utilisé Node.js 20.20.2.
Les contrôles clients ne sont plus conditionnés à la présence d'un lock : `npm ci` est obligatoire
pour le web et le mobile, suivi du lint, du typage, de la compilation et de l'audit. Les builds
natifs signés, tests sur appareil et MobSF restent à exécuter lors de la préparation à la livraison.

Le modèle public `config.local.example` contient des champs secrets vides et des paramètres de
développement. Il remplace dans la documentation la copie d'un fichier `.env.example` existant.
Les fichiers `.env` et `.env.*` de la machine n'ont pas été lus ni copiés dans la publication.

## Audit mobile bloquant

L'audit initial signale 22 entrées (15 de sévérité élevée, 7 modérées), par propagation de trois
avis dans l'arbre Expo/Metro. Ce nombre ne représente pas 22 vulnérabilités distinctes.

| Dépendance transitive | Avis | État vérifié le 10 octobre 2026 |
| --- | --- | --- |
| `braces` 3.0.3 | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Élevée ; aucune version corrigée indiquée |
| `node-forge` 1.4.0 | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Élevée ; aucune version corrigée indiquée |
| `uuid` 7.0.3 via `xcode` | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | Modérée ; correctif à partir de 11.1.1, hors plage du consommateur actuel |

`npm audit --audit-level=high` reste bloquant. Les propositions automatiques de retour vers
Expo 44 / React Native 0.72 n'ont pas été appliquées : elles sortent de la combinaison du SDK 57.
Aucune exclusion d'avis ni réduction du seuil d'audit n'a été ajoutée. La mise à jour des
dépendances amont et une nouvelle validation seront nécessaires avant de lever ce blocage.

## Configuration mobile

Le plugin officiel `expo-build-properties` désactive le HTTP en clair sur Android. La configuration
iOS conserve `NSAllowsArbitraryLoads: false`. Les permissions microphone et ancien stockage externe
sont bloquées. Leur effet devra être vérifié sur un build natif ; l'export JavaScript seul ne le
démontre pas. Le stockage sécurisé des jetons, leur rotation et le certificate pinning seront
implémentés avec l'authentification mobile.
