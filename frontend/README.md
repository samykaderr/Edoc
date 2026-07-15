# Frontend React

Cette application React affiche la liste des types de documents, charge le JSON Schema associé à chaque document et rend un formulaire dynamique à partir de ce schéma.

## Ce qui a changé

- Les URLs d’API passent maintenant par [src/services/api.js](src/services/api.js).
- La base de l’API est configurable via `VITE_API_BASE`.
- La vue formulaire utilise `schemaName` pour charger le bon schéma JSON.
- Le renderer gère les champs JSON Schema les plus courants: `required`, `enum`, `enumTitles`, `format`, `pattern`, `minLength`, `maxLength` et certaines règles conditionnelles `allOf`.

## Contrat backend utilisé

- `GET /api/documents` retourne les types de documents.
- `GET /api/documents/schemas/{schemaName}` retourne le schéma JSON du document.
- `POST /api/documents/soumettre` valide et enregistre le formulaire rempli.

Le backend présent dans `BackEnd/BackEnd` expose par exemple le schéma `demande_conge.json`, associé au document `CONGE`.

## Configuration locale

Créer un fichier `.env` dans ce dossier si vous voulez pointer vers une API différente de la proxy Vite locale:

```env
VITE_API_BASE=http://localhost:8080/api
```

Si la variable n’est pas définie, le frontend utilise `/api` et la configuration Vite peut proxyfier vers le backend local.

## Lancer le projet

```bash
npm install
npm run dev
```

Pour le build de production:

```bash
npm run build
```

## Structure utile

- [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx) : liste les documents et navigue vers le formulaire associé.
- [src/pages/ViewForm.jsx](src/pages/ViewForm.jsx) : charge le schéma via `schemaName` et affiche le formulaire.
- [src/components/FormRenderer.jsx](src/components/FormRenderer.jsx) : rendu générique du formulaire à partir du schéma.
- [src/services/api.js](src/services/api.js) : client Axios et helpers d’API.
- [vite.config.js](vite.config.js) : proxy de développement vers le backend local.

## Notes d’implémentation

- Le champ `schemaName` est la clé de navigation entre la liste et la vue formulaire.
- Les valeurs numériques sont converties avant envoi au backend.
- Les champs vides sont retirés du payload envoyé pour garder une charge utile propre.

## Vérifications à faire côté backend

- Le backend doit être démarré sur le port `8080` en local, ou l’URL doit être adaptée dans `.env`.
- Le schéma JSON doit rester compatible avec le rendu générique du frontend.