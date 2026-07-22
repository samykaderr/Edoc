// src/services/formDataService.js
const BASE_URL = 'http://localhost:8081/api/v1';

export const formDataService = {
  /**
   * Insère une nouvelle ligne de données dans MySQL
   */
  async insert(tableName, rawPayload) {
    const response = await fetch(`${BASE_URL}/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: tableName,
        payload: rawPayload,
      }),
    });
    if (!response.ok) throw new Error("Erreur lors de l'enregistrement des données.");
    return response.json();
  },

  /**
   * Récupère l'intégralité des données d'une table
   */
  async all(tableName) {
    const response = await fetch(`${BASE_URL}/all?table=${tableName}`);
    if (!response.ok) throw new Error("Impossible de charger les données.");
    return response.json();
  }
};