// src/services/definitionService.js
// Endpoints alignés sur FormDefinitionController.java :
//   POST /api/v1/definitions/table   → creerTable
//   POST /api/v1/definitions/fields  → createFields (ajout de colonnes)
//   PUT  /api/v1/definitions/fields  → updateFields (modification de colonnes)

const BASE_URL = '/api/v1/definitions';

export const definitionService = {
  /**
   * Initialise une table physique vide dans MySQL.
   * Aligne sur : POST /api/v1/definitions/table
   * Payload attendu : { tableName: "demande_conge" }
   */
  async creerTable(tableName) {
    const response = await fetch(`${BASE_URL}/table`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableName }),
    });
    if (!response.ok) throw new Error('Échec lors de la création de la table.');
    return response.json();
  },

  /**
   * Injecte les colonnes typées dans une table existante.
   * Aligne sur : POST /api/v1/definitions/fields
   * Payload attendu : { tableName: "demande_conge", columns: [...] }
   */
  async createFields(mysqlPayload) {
    const response = await fetch(`${BASE_URL}/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mysqlPayload),
    });
    if (!response.ok) throw new Error("Échec lors de l'injection des colonnes.");
    return response.json();
  },

  /**
   * Modifie les colonnes d'une table existante.
   * Aligne sur : PUT /api/v1/definitions/fields
   * Payload attendu : { tableName: "demande_conge", columns: [...] }
   */
  async updateFields(mysqlPayload) {
    const response = await fetch(`${BASE_URL}/fields`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mysqlPayload),
    });
    if (!response.ok) throw new Error('Échec lors de la modification des colonnes.');
    return response.json();
  },
};

// Alias nommés pour la compatibilité avec CreateForm.jsx
export const creerTable = definitionService.creerTable.bind(definitionService);
export const creerChamps = definitionService.createFields.bind(definitionService);