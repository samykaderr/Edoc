# BackEnd

Backend Spring Boot du projet Edoc Soummam. Cette partie expose une API REST pour gérer et valider des documents, avec un premier cas fonctionnel centré sur les demandes de congé.

## Vue d'ensemble

Le backend est construit avec:

- Java 17
- Spring Boot 3.2.5
- Spring Web pour l'API REST
- Spring Data JPA pour la persistance
- MySQL pour les profils d'exécution
- `json-schema-validator` pour valider les payloads JSON

Le flux principal actuel est le suivant:

1. le front-end récupère la liste des types de documents disponibles
2. il peut charger le schéma JSON associé à un type de document
3. il envoie ensuite le formulaire rempli au backend
4. le backend valide le JSON par rapport au schéma
5. si la validation est correcte, la demande est convertie en entité Java puis enregistrée en base

## Fonctionnalités actuelles

- Liste des types de documents exposés par l'API
- Récupération du schéma JSON d'un document
- Validation stricte d'un document avant sauvegarde
- Sauvegarde d'une demande de congé via JPA
- Héritage JPA avec une table par entité spécialisée

## Structure du projet

- `src/main/java/com/soummam/backend/BackEndApplication.java` : point d'entrée Spring Boot
- `src/main/java/com/soummam/backend/controller/DocumentController.java` : endpoints REST
- `src/main/java/com/soummam/backend/service/JsonValidationService.java` : validation JSON Schema
- `src/main/java/com/soummam/backend/model/Document.java` : entité mère des documents
- `src/main/java/com/soummam/backend/model/Conge.java` : entité métier pour les demandes de congé
- `src/main/java/com/soummam/backend/repository/CongeRepository.java` : accès JPA aux congés
- `src/main/resources/schema/demande_conge.json` : schéma JSON de validation
- `src/main/resources/application.properties` : configuration Spring commune
- `src/main/resources/application-local.properties` : profil local
- `src/main/resources/application-prod.properties` : profil production

## Modèle métier

### `Document`

Entité abstraite stockée dans `t_document` avec:

- un identifiant UUID
- un type de document
- un statut par défaut `NEW`
- une date de création auto-initialisée
- un identifiant employé obligatoire

### `Conge`

Spécialisation de `Document` stockée dans `t_conge` avec:

- `dateDebut`
- `dateFin`
- `motif`

## Schéma JSON

Le schéma `demande_conge.json` impose notamment:

- `idEmploye`, `dateDebut`, `dateFin` et `typeConge` obligatoires
- `typeConge` limité à `ANNUEL`, `MALADIE` ou `SANS_SOLDE`
- `motif` avec une longueur comprise entre 10 et 500 caractères
- `referenceMedicale` obligatoire si `typeConge` vaut `MALADIE`

## API REST

Base URL en local: `http://localhost:8081`

Base URL en production: `http://localhost:8080`

### `GET /api/documents`

Retourne la liste des types de documents disponibles.

Réponse actuelle:

- code `CONGE`
- titre `Demande de congé`
- schéma `demande_conge`

### `GET /api/documents/schemas/{schemaName}`

Retourne le contenu JSON du schéma demandé depuis `src/main/resources/schema`.

Exemple:

```http
GET /api/documents/schemas/demande_conge
```

### `POST /api/documents/soumettre`

Valide le JSON reçu, le convertit en entité `Conge`, puis l'enregistre en base.

Exemple de payload:

```json
{
  "idEmploye": 1001,
  "dateDebut": "2026-07-20",
  "dateFin": "2026-07-25",
  "typeConge": "ANNUEL",
  "motif": "Congé annuel pour repos et récupération."
}
```

Si `typeConge` vaut `MALADIE`, le champ `referenceMedicale` devient obligatoire.

## Réponses attendues

- `201 Created` si le document est validé et sauvegardé
- `400 Bad Request` si le JSON ne respecte pas le schéma
- `500 Internal Server Error` en cas d'erreur technique

## Profils de configuration

Le projet utilise deux profils Spring:

- `local` par défaut, avec le port `8081` et des valeurs MySQL de développement
- `prod`, avec le port `8080` et des variables d'environnement pour la base de données

Pour forcer un profil:

```bat
set SPRING_PROFILES_ACTIVE=prod
mvnw.cmd spring-boot:run
```

ou en PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE = "prod"
.\mvnw.cmd spring-boot:run
```

Les variables utiles sont `SERVER_PORT`, `DB_URL`, `DB_USERNAME`, et `DB_PASSWORD`.

## Lancer le projet

### Prérequis

- JDK 17
- Maven ou le wrapper Maven fourni

### Avec le wrapper Maven

```bash
./mvnw spring-boot:run
```

Sous Windows:

```bat
mvnw.cmd spring-boot:run
```

### Générer le build

```bash
./mvnw clean package
```

Sous Windows:

```bat
mvnw.cmd clean package
```

## Remarques

- L'API accepte actuellement un seul type de document métier: la demande de congé.
- Le contrôleur est configuré avec `@CrossOrigin(origins = "*")` pour permettre les appels depuis le front-end.
- La validation fonctionnelle repose sur le schéma JSON, pas seulement sur le mapping Java.
