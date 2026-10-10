# Application mobile étudiante

React Native 0.86, Expo SDK 57 et TypeScript strict, à partir du modèle officiel
`expo-template-blank-typescript` 57.0.29. L’écran d’accueil est en français et tient compte des
zones de sécurité du téléphone. Les parcours métier restent à développer selon le
[PRD](../docs/PRD.md).

## Développement

Node.js 24 LTS est la version utilisée en CI et indiquée dans `.nvmrc` à la racine.
Depuis `mobile/` :

```bash
npm ci
npm start
```

Ouvrir le projet avec une version d’Expo Go compatible avec le SDK 57, ou avec un build de
développement. `npm run android` et `npm run ios` ouvrent respectivement l’émulateur Android
et le simulateur iOS (ce dernier nécessite macOS et Xcode).

## Vérifications

```bash
npm run lint
npm run typecheck
npm run check:dependencies
npm run build
npm audit --audit-level=high
```

`npm run build` exporte les bundles de production Android **et** iOS dans `dist/`. Il ne crée
pas d’APK ou d’archive iOS signée. La compilation native, les tests sur appareil et MobSF seront
ajoutés avant livraison. ESLint 10, TypeScript et les règles React Hooks sont utilisés ;
`eslint-config-expo` 57 dépend encore de plugins limités à ESLint 9, désormais déprécié.
Les versions natives sont alignées sur `expo/bundledNativeModules.json` et vérifiées en CI.

## Configuration native et sécurité

`app.json` déclare Android et iOS, refuse les connexions HTTP en clair dans les builds natifs
et bloque les permissions microphone et ancien stockage externe. Ces options s’appliquent
après génération/compilation native ; Expo Go conserve les permissions et la configuration de
son propre binaire. Aucun endpoint ni stockage de jeton n’est ajouté à cet accueil.

L’intégration de l’API ajoutera `expo-secure-store` pour les jetons, leur rotation/révocation
et le certificate pinning, avec tests sur un build natif. Aucun secret ne doit être placé dans
les variables `EXPO_PUBLIC_*` ni dans `app.json`.

Le premier audit et ses blocages sont suivis dans
[la validation des clients](../docs/preuves/validation-clients.md).

Références : [création d’un projet Expo](https://docs.expo.dev/get-started/create-a-project/),
[TypeScript](https://docs.expo.dev/guides/typescript/).
