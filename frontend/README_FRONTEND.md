# Documentation du Frontend

Cette documentation couvre l'architecture, l'installation, l'exécution et la description des principaux fichiers du projet frontend.

## Aperçu
- **But**: Interface React pour gérer et visualiser des types de documents (tableau de bord, création et consultation de formulaires).
- **Stack**: React + Vite, React Router, Axios.

## Prérequis
- Node.js (16+) installé
- npm ou pnpm (les scripts utilisent npm par défaut)

## Scripts utiles
- `npm run dev` : démarre le serveur de développement Vite
- `npm run build` : construit l'application pour production (dossier `dist`)
- `npm run preview` : prévisualise le build localement
- `npm run lint` : lance l'outil de lint (configuration locale via `oxlint`)

## Configuration de développement
- Proxy API: la configuration Vite redirige `/api` vers l'API backend en local. Voir [vite.config.js](vite.config.js).

## Structure du projet
- [index.html](index.html) : point d’entrée HTML (monte `src/main.jsx`).
- [src/main.jsx](src/main.jsx) : point d’entrée JS — crée la racine React et monte `App`.
- [src/App.jsx](src/App.jsx) : routage principal avec `react-router-dom` (routes `/`, `/create`, `/view/:id`).
- [src/pages](src/pages) : pages principales (Dashboard, CreateForm, ViewForm).
- [src/components](src/components) : composants réutilisables (ex. `FormRenderer.jsx`).
- [src/hooks](src/hooks) : hooks personnalisés (ex. `useDocuments.js`).
- [src/services](src/services) : clients et services (ex. `api.js` pour Axios).
- [src/assets](src/assets) : styles globaux (`index.css`, `App.css`) et assets.

## Points d'entrée et routage
- Le HTML initial ([index.html](index.html)) charge `src/main.jsx`.
- `src/main.jsx` importe `App` et les styles globaux.
- `src/App.jsx` définit les routes:
  - `/` → `Dashboard`
  - `/create` → `CreateForm` (en construction)
  - `/view/:id` → `ViewForm` (en construction)
  - `*` → redirection vers `/`

## Pages
- [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx)
  - Utilise le hook `useDocuments` pour récupérer la liste des types de documents via l'API.
  - Affiche un panneau d'en-tête, un compteur et une grille de cartes pour chaque type de document.
  - Gère les états `loading` et `error`.

- [src/pages/CreateForm.jsx](src/pages/CreateForm.jsx)
  - Page de création — placeholder pour implémentation future.

- [src/pages/ViewForm.jsx](src/pages/ViewForm.jsx)
  - Page de consultation — placeholder pour implémentation future.

## Composants
- [src/components/FormRenderer.jsx](src/components/FormRenderer.jsx)
  - Composant prévu pour le rendu dynamique d'un formulaire à partir d'un `schema`.
  - Actuellement stub: affiche un message "Rendu du formulaire dynamique à implémenter...".

## Hooks
- [src/hooks/useDocuments.js](src/hooks/useDocuments.js)
  - Fournit `documentTypes`, `loading`, `error`.
  - Charge `GET /documents` via l'instance Axios exportée dans `src/services/api.js`.
  - Erreurs: expose `error` avec message générique en cas d'échec.

## Services / API
- [src/services/api.js](src/services/api.js)
  - Configure une instance Axios avec `baseURL: http://localhost:8080/api`.
  - Utiliser cette instance pour toutes les requêtes vers le backend (gestion centralisée des headers, interceptors possible si besoin).

## Styles et assets
- [src/assets/index.css](src/assets/index.css) : variables CSS, réglages globaux, thèmes clair/sombre.
- [src/assets/App.css](src/assets/App.css) : styles d'interface (app-shell, hero-panel, cards-grid, document-card, etc.).
- La structure actuelle force une vue desktop (`min-width: 1024px` / `desktop-only`), garder à l'esprit pour l'accessibilité et responsive.

## Dépendances notables
- `react`, `react-dom` (React 19)
- `react-router-dom` : routage côté client
- `axios` : requêtes HTTP
- `vite` + `@vitejs/plugin-react` : bundler/dev server

## Bonnes pratiques et recommandations
- Implémenter `FormRenderer` pour rendre dynamiquement les schémas JSON reçus du backend.
- Ajouter gestion d'erreurs et retry pour les appels API critiques.
- Extraire constantes (endpoints) et gérer `baseURL` via variables d'environnement (`.env`) pour les environnements (dev/staging/prod).
- Rendre l'UI responsive (supprimer la contrainte `min-width` ou ajouter styles mobile).
- Ajouter des tests unitaires pour les hooks et composants critiques.

## Points TODO identifiés
- `FormRenderer.jsx` : implémentation du rendu dynamique.
- `CreateForm.jsx` / `ViewForm.jsx` : compléter les formulaires et la logique CRUD.
- Auth / gestion des droits si nécessaire côté API.

## Lancer le projet localement
1. Installer les dépendances:

```
npm install
```

2. Démarrer le serveur de dev (Vite):

```
npm run dev
```

3. Ouvrir `http://localhost:5173` (ou l'URL indiquée par Vite).

## Remarques finales
La base du frontend est en place: routage, style et intégration API de base. Plusieurs composants/pages sont encore en construction — la prochaine étape recommandée est d'implémenter `FormRenderer` et d'ajouter la gestion complète des formulaires (création, validation, sauvegarde).
