# Application web

React 19, Vite 8 et TypeScript, à partir du modèle officiel `create-vite` 9.2.1.
L’écran d’accueil est en français et s’adapte aux petits écrans. Les parcours métier et
l’authentification seront ajoutés selon le [PRD](../docs/PRD.md).

## Développement

Node.js 24 LTS est la version utilisée en CI et indiquée dans `.nvmrc` à la racine.
Depuis `web/` :

```bash
npm ci
npm run dev
```

Le serveur de développement écoute sur `http://localhost:5173`.

## Vérifications

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
```

`npm run build` produit les fichiers statiques dans `dist/`. `npm run preview` permet de les
vérifier localement ; le serveur de production sera Nginx. Ces contrôles sont exécutés en CI
avec les versions de `package-lock.json`. Chaque futur parcours aura ses tests fonctionnels et
de sécurité ; l’accueil statique n’appelle pas encore l’API.

## Intégration à venir

L’API et le web partageront la même origine en production (`/api/`). L’URL de l’API passera par
`VITE_API_URL` lors de l’ajout du client HTTP. Toute variable `VITE_*` est publique.
L’authentification utilisera la session Django, un cookie `HttpOnly` et la protection CSRF,
conformément à [RULES.md](../docs/RULES.md). Aucun jeton ne doit être stocké dans `localStorage`.

Référence : [guide officiel Vite](https://vite.dev/guide/).
