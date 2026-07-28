// src/services/formDataService.js
// Endpoints alignés sur FormDataController.java :
//   GET  /api/v1/form-data/{tableName}  → findAll
//   POST /api/v1/form-data/{tableName}  → insert
// Et sur FormDefinitionController.java :
//   POST /api/v1/definitions/sync       → syncSchema

const BASE_URL = '/api/v1';

export const formDataService = {
  /**
   * Insère une nouvelle ligne de données dans MySQL.
   * Aligne sur : POST /api/v1/form-data/{tableName}
   */
  async insert(tableName, payload) {
    const response = await fetch(`${BASE_URL}/form-data/${encodeURIComponent(tableName)}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Erreur ${response.status} lors de l'enregistrement.`;
      const details = errorData.details ? `\n(Détails techniques : ${errorData.details})` : '';
      throw new Error(errorMessage + details);
    }
    
    return response.json();
  },

  /**
   * Récupère l'intégralité des données d'une table.
   * Aligne sur : GET /api/v1/form-data/{tableName}
   */
  async findAll(tableName) {
    const response = await fetch(`${BASE_URL}/form-data/${encodeURIComponent(tableName)}`);
    if (!response.ok) throw new Error('Impossible de charger les données.');
    return response.json();
  },

  /**
   * Synchronise le schéma JSON avec la base de données (création table / colonnes).
   * Aligne sur : POST /api/v1/definitions/sync
   */
  async syncSchema(tableName, schemaData) {
    const response = await fetch(`${BASE_URL}/definitions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableName: tableName,
        schema: schemaData,
      }),
    });
    if (!response.ok) throw new Error('Erreur de synchronisation du schéma.');
    return response.json();
  },

  /**
   * Alias `all` → `findAll` pour la compatibilité avec
   * DocumentsList.jsx et DocumentTypeManager.jsx.
   */
  async all(tableName) {
    return this.findAll(tableName);
  },

  /**
   * Récupère un seul enregistrement par son identifiant.
   * Aligne sur : GET /api/v1/form-data/{tableName}/{id}
   * Normalise les clés en minuscules (certains drivers MySQL retournent en MAJUSCULES).
   */
  async findById(tableName, id) {
    const response = await fetch(
      `${BASE_URL}/form-data/${encodeURIComponent(tableName)}/${encodeURIComponent(id)}`
    );
    if (response.status === 404) {
      throw new Error(`Document introuvable (id=${id}, table=${tableName}).`);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Erreur ${response.status} lors du chargement.`;
      throw new Error(errorMessage);
    }
    const data = await response.json();
    // Normalisation des clés en minuscules pour l'uniformité avec les noms de champs du schéma
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k.toLowerCase(), v])
    );
  },
};