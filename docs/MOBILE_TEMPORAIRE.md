# Report temporaire de l'application mobile — 12 octobre 2026

Le périmètre actuel du socle comprend l'API Django et le client web React. À la demande du
propriétaire, l'application Expo est temporairement retirée du dépôt de travail, avec son code,
ses ressources, son manifeste et son verrouillage. Le mobile reste une exigence du produit cible.

## Motif et portée

L'audit npm du 12 octobre 2026 relève toujours deux avis de sévérité élevée dans les dépendances
transitives du mobile, sans version corrigée publiée :

- `braces` 3.0.3 : [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- `node-forge` 1.4.0 : [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

Les versions proposées par `npm audit fix --force` impliquent notamment un retour vers Expo 44,
hors de la combinaison Expo 57 / React Native 0.86 choisie. Ce retour n'a pas été appliqué.
L'avis modéré [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq) reste aussi à traiter.
La [validation initiale](preuves/validation-clients.md) conserve les résultats précédents.

La matrice frontend ne contient désormais que `web`. L'entrée Dependabot `/mobile` et les étapes
Expo sont retirées avec l'application. Les contrôles du web et du backend, les seuils d'audit,
les scans de secrets, SAST, Trivy et ZAP restent actifs. Aucun avis de sécurité n'est ignoré.
Une CI verte valide ce périmètre réduit ; elle ne signifie pas que les failles mobiles sont corrigées
ni que le produit complet est prêt pour la production.

La règle GitHub « Protection main et develop » exige encore le statut
`Qualité et dépendances mobile`. Le propriétaire devra retirer ce seul statut des vérifications
requises après relecture du report, puis le rétablir à la réintégration. Sans cette adaptation,
GitHub attendra un job qui n'existe plus et bloquera la fusion même si les jobs exécutés réussissent.
Les autres vérifications requises et l'approbation humaine restent nécessaires.

## Code conservé et réintégration

Le client complet reste disponible dans le commit
[`ef598c309e18163c0e7bd281f2439184228cb995`](https://github.com/sayouba2/plateforme-pfe/tree/ef598c309e18163c0e7bd281f2439184228cb995/mobile).
L'historique n'est pas réécrit. Les PR de dépendances mobiles existantes ne doivent pas être
fusionnées tant que ce report est en vigueur ; leur contenu sera réévalué à la réintégration.

La reprise se fait dans une branche dédiée depuis `develop`, par exemple :

```bash
git switch -c feat/reintegration-mobile origin/develop
git restore --source=ef598c309e18163c0e7bd281f2439184228cb995 --staged --worktree -- mobile
```

Avant fusion de la PR de réintégration :

1. Vérifier les correctifs publiés et leur compatibilité avec Expo/React Native. Mettre à jour
   `mobile/package.json` et `mobile/package-lock.json` ensemble ; ne pas fusionner l'ancien lock
   vulnérable tel quel.
2. Réintroduire `mobile` dans la matrice frontend et les variables `EXPO_NO_DOTENV: "1"` et
   `EXPO_NO_TELEMETRY: "1"`. Rétablir l'étape `npm run check:dependencies` pour le mobile,
   avant `npm run build`, qui doit exporter Android et iOS.
3. Rétablir l'entrée npm `/mobile` dans Dependabot, ciblant `develop` avec un contrôle hebdomadaire.
4. Exécuter `npm ci`, lint, TypeScript, compatibilité Expo, export Android/iOS et
   `npm audit --audit-level=high`. Tous ces contrôles doivent être bloquants et réussir en CI.
   Rétablir le statut mobile requis dans la protection de `main` et `develop`.
5. Mettre à jour les README, l'état du socle et les preuves, puis faire relire la PR. Les builds
   natifs, les tests sur appareil et MobSF restent requis avant la livraison mobile de production.

Les règles mobiles de `RULES.md`, les exigences du PRD et le modèle de menace restent applicables
à cette reprise.
