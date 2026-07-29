# Documentation Technique — Front-End (React) & Form Engine

Cette documentation de niveau architecture (Senior Engineer) présente la structure globale, les concepts clés, le fonctionnement du moteur de formulaires dynamiques (Form Engine) et intègre les dernières modifications (Mode Consultation, Normalisation de casse).

---

# 📄 Documentation Technique — Front-End (React) & Form Engine

Cette documentation de niveau architecture (Senior Engineer) présente la structure globale, les concepts clés, le fonctionnement du moteur de formulaires dynamiques (Form Engine) et intègre les dernières modifications (Mode Consultation, Normalisation de casse).

---

## 1. Vue d'Ensemble & Architecture Composants

L'application Front-End est une SPA (Single Page Application) React propulsée par Vite. Elle est structurée selon une approche **orientée fonctionnalités (features)**.

```mermaid
flowchart TD
    classDef router fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#0d47a1;
    classDef pages fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#e65100;
    classDef engine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b5e20;
    classDef subEngine fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c;
    classDef service fill:#fffde7,stroke:#fbc02d,stroke-width:2px,color:#f57f17;
    classDef backend fill:#efebe9,stroke:#4e342e,stroke-width:2px,color:#3e2723;

    subgraph FRONTEND ["🎨 Frontend React (Vite SPA)"]
        Router["🌐 React Router"]:::router
        
        subgraph PAGES ["📌 Pages & Vues Principales"]
            DVM["👁️ DocumentViewPage.jsx<br/>(Mode Consultation)"]:::pages
            DTM["⚙️ DocumentTypeManager.jsx<br/>(Administration)"]:::pages
        end
        
        subgraph CORE ["🧩 Form Engine Core"]
            FE["🔥 FormEngine (index.jsx)"]:::engine
            Parser["⚡ jsonParser.ts<br/>(Aplatissement & Normalisation)"]:::subEngine
            FR["🎨 render.jsx<br/>(FieldRenderer Adaptatif)"]:::subEngine
        end
        
        Svc["📡 formDataService.js"]:::service
    end

    subgraph BACKEND ["⚙️ API REST Backend"]
        API["🚀 Spring Boot Endpoints"]:::backend
    end

    %% Interconnections
    Router --> DVM
    Router --> DTM
    
    DVM -->|"Initialise & Injecte Data"| FE
    DTM -->|"Configuration Schéma JSON"| FE
    
    FE -->|"Parsing & Traitement Schéma"| Parser
    FE -->|"Rendu Dynamique UI"| FR
    FE -->|"Requêtes REST"| Svc
    
    Svc -->|"POST / GET / PUT"| API

### Concepts Clés
1. **Pilotage par les données (Data-Driven)** : L'UI n'est pas codée en dur. Les formulaires sont générés dynamiquement à partir de fichiers `.json` (JSON Schema) stockés dans `/public/schema/`.
2. **Couplage lâche** : Le composant de rendu (`FieldRenderer`) ne connaît pas la logique métier, il se contente d'afficher un contrôle (input, select) selon les instructions de l'orchestrateur (`FormEngine`).
3. **Architecture CSS Modulaire** : Chaque composant possède son propre fichier `.css` (ex: `FormRenderer.css`, `Sidebar.css`), abandonnant ainsi le modèle monolithique.

---

## 2. Le Moteur de Formulaire (Form Engine)

Le cœur de l'application réside dans `src/features/form-engine/`. Ce moteur transforme un Schéma JSON en un formulaire interactif, gère l'état, valide les saisies et prépare le payload pour l'API.

### A. Flux de Création et de Consultation (Diagramme de Séquence)

Voici le cycle de vie complet de la donnée, depuis le clic utilisateur jusqu'à la persistance en base de données, incluant le flux de consultation récemment ajouté.

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as React Frontend (FormEngine)
    participant C as DataController
    participant S as DataService
    participant R as DataRepository
    participant DB as MySQL

    Note over U,DB: Flux 1 : Création d'un document
    U->>F: Remplit et soumet le formulaire
    F->>F: Validation métier & Aplatissement (camelCase -> underscore)
    F->>C: POST /api/v1/form-data/{tableName}
    C->>S: insert(tableName, payload)
    S->>R: insertMasterDocument() -> t_document
    R-->>S: document_id généré
    S->>S: Injecte document_id dans le payload
    S->>R: insertDynamic() -> table spécifique
    R->>DB: INSERT INTO {tableName}
    DB-->>C: 201 Created
    C-->>F: Succès

    Note over U,DB: Flux 2 : Consultation (Lecture Seule)
    U->>F: Clique sur l'icône "œil" depuis le tableau
    F->>F: navigate('/view/{tableName}/{id}')
    F->>C: GET /api/v1/form-data/{tableName}/{id}
    C->>DB: SELECT * FROM {tableName} WHERE id = ?
    DB-->>F: Ligne JSON (Clés SQL en minuscules)
    F->>F: Normalisation pathToSchemaKey (minuscule -> camelCase)
    F->>U: Affiche Formulaire (globalReadOnly=true)
```

### B. Mode Consultation & Normalisation de Casse (Nouveauté)

Lorsqu'un utilisateur souhaite consulter un document existant (via `DocumentViewPage.jsx`), le composant active le mode **Lecture Seule**.

1. **`globalReadOnly`** : Le paramètre `globalReadOnly={true}` est passé à `<FormRenderer />`.
   - Il désactive la soumission.
   - Il masque le bouton de validation.
   - Il propage la propriété `disabled={true}` à **tous** les contrôles gérés par `render.jsx`.
   - Il sécurise l'affichage des `<select>` en forçant un affichage type `<input type="text">` pour éviter que le dropdown ne semble interactif.
2. **Normalisation via `pathToSchemaKey`** :
   - Problème : La BDD MySQL renvoie des clés de colonnes en minuscules (`datedebut`, `motif`), mais le JSON Schema original s'attend à du CamelCase (`dateDebut`, `motif`).
   - Solution : Lors de la synchronisation de `initialData` (dans `index.jsx`), un dictionnaire de correspondance dynamique est construit. Il parcourt le schéma JSON résolu et associe chaque chemin minuscule à sa véritable casse originale. Le payload reçu de l'API est ainsi "reconstruit" avant d'être injecté dans le state React.

### C. Validation & Évaluation des Expressions

- **Validation Structurelle (`validator/index.js`)** : Vérifie le type (entier, décimal), la présence (champs requis), la longueur (`maxLength`, `minLength`), et les expressions régulières (`pattern`). Intègre également des validations métier inter-champs (ex: `dateDebut <= dateFin`).
- **Évaluation Dynamique (`expression-evaluator/index.js`)** : Déclenche l'affichage ou l'obligation de certains champs basés sur les saisies de l'utilisateur (via les blocs `allOf / if / then` du JSON Schema).

---

## 3. Interaction avec l'API & Gestion des Erreurs

Les appels vers le backend Spring Boot sont centralisés dans `formDataService.js`.

- **Interception des Erreurs SQL** : Le client frontend est conçu pour lire la structure d'erreur enrichie renvoyée par le backend. Si le serveur renvoie une `400 Bad Request` contenant un champ `details` (ex: `Unknown column 'test'`), l'interface l'affiche clairement à l'utilisateur, facilitant le débogage (surtout lors de la conception de nouveaux formulaires).
- **Navigation Fiable** : Le bouton de visualisation (icône œil) dans `DocumentsList.jsx` extrait le `tableName` directement de l'objet ligne, garantissant une navigation correcte indépendamment de l'état des filtres du tableau.
