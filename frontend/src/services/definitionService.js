// src/services/definitionService.js
const BASE_URL = 'http://localhost:8081/api/v1';

export const definitionService = {
  /**
   * Initialise la table physique vide
   * payload: { tableName: "demande_conge" }
   */
  async creerTable(tableName) {
    const response = await fetch(`${BASE_URL}/creerTable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableName }),
    });
    if (!response.ok) throw new Error("Échec lors de la création de la table.");
    return response.json();
  },

  /**
   * Injecte les colonnes typées MySQL
   * payload: { tableName: "demande_conge", columns: [...] }
   */
  async creerChamps(mysqlPayload) {
    const response = await fetch(`${BASE_URL}/creerChamps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mysqlPayload),
    });
    if (!response.ok) throw new Error("Échec lors de l'injection des colonnes.");
    return response.json();
  }
};