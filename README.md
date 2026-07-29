<div align="center">

  # 📄 e-Doc Management Engine
  ### *Plateforme Dynamique de Gestion & Génération de Documents*

  [![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
  [![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
  [![Java](https://img.shields.io/badge/Java-17%2B-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
  [![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#)

  <p align="center">
    Une solution d'entreprise permettant la création dynamique de formulaires, la génération à la volée de schémas de base de données (DDL) et le traitement transactionnel Master-Detail des documents métier.
  </p>

</div>

---

## 🌟 Aperçu du Projet

**e-Doc Management Engine** est une application web fullstack conçue pour automatiser et flexibiliser la gestion documentaire. Elle permet de créer des types de formulaires personnalisés sans recompiler l'application, en synchronisant directement les interfaces Frontend React avec le schéma relationnel MySQL.

### 🔑 Points Forts & Fonctionnalités

* ⚡ **Génération DDL Dynamique :** Création et modification automatique des tables (`ALTER` / `CREATE`) et des colonnes en BDD à partir des métadonnées de formulaires.
* 🛡️ **Architecture Master-Detail Sécurisée :** Registre centralisé (`t_document`) couplé de façon transactionnelle (`@Transactional`) aux tables filles spécifiques (ex: `requisition`, `demande_conge`).
* 🎨 **FormEngine React :** Rendu dynamique des formulaires côté client basé sur les définitions JSON backend.
* 🔐 **Sécurité & Intégrité :** Validation stricte des identifiants SQL contre les injections et gestion des variables d'environnement (`DB_PASSWORD`).
* 📊 **Suivi & Traçabilité :** Statuts dynamiques des documents (`PENDING`, `PROCESSED`, etc.) et historisation centralisée.

---

## 🛠️ Stack Technique

### **Backend**
* **Framework :** Spring Boot
* **Langage :** Java 17+
* **Accès Données :** `JdbcTemplate` (Pour un contrôle DDL/DML dynamique performant)
* **Transaction :** Spring Transactional (`@Transactional`)
* **Base de Données :** MySQL 8.0+

### **Frontend**
* **Bibliothèque :** React 18+
* **Routage :** React Router v6
* **UI & Style :** CSS3 Moderne (Flexbox/Grid, Responsive Desktop-first)

---

## 📐 Architecture & Flux de Données

```mermaid
flowchart TD
    classDef client fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef backend fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20;
    classDef ddl fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100;
    classDef db fill:#efebe9,stroke:#5d4037,stroke-width:2px,color:#3e2723;

    subgraph CLIENT ["🎨 Frontend React"]
        Form["📝 FormEngine Component"]:::client
    end

    subgraph BACKEND ["⚙️ Spring Boot Engine"]
        API["🚀 DataController\n(POST /api/data/{table})"]:::backend
        SRV["🛡️ DataService\n(@Transactional)"]:::backend
        
        subgraph ENGINE ["⚡ Dynamic DDL & Repository"]
            DDL["🔍 DDL Check / Auto-Create"]:::ddl
            REP["📦 DataRepository"]:::backend
        end
    end

    subgraph STORAGE ["🛢️ MySQL Database"]
        MasterDB[("📋 t_document\n(Table Master Centralisée)")]:::db
        ChildDB[("📑 {tableName}\n(Table Fille Dynamique)")]:::db
    end

    %% Flux de données
    Form -->|"1. Payload JSON"| API
    API -->|"2. Process Transaction"| SRV
    
    SRV -->|"3. Auto-migration DDL"| DDL
    DDL -.->|"CREATE / ALTER IF NOT EXISTS"| StorageCheck["Structure BDD"]
    
    SRV -->|"4. Insert Master"| REP
    REP -->|"5. INSERT"| MasterDB
    MasterDB -- "6. Return ID auto_increment" --> REP
    
    REP -->|"7. Insert Specific Data"| ChildDB
    
    SRV -.->|"8. HTTP 201 Created"| Form
