// src/services/api.js
// Toutes les requêtes passent par le proxy Vite `/api` → http://localhost:8081
// La variable VITE_API_BASE peut surcharger en production.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE?.trim() || '/api',
});

// ---------------------------------------------------------------------------
// Endpoints déclarés — alignés sur les @RequestMapping Java réels
// ---------------------------------------------------------------------------

export const employeEndpoints = {
  // GET /api/v1/employes/{id}  →  EmployeController.java
  getById: (id) => `/v1/employes/${encodeURIComponent(id)}`,
};

// ---------------------------------------------------------------------------
// Utilitaire de normalisation des réponses API
// ---------------------------------------------------------------------------

export function normalizeApiData(data) {
  if (typeof data !== 'string') {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

// ---------------------------------------------------------------------------
// Fonctions d'appel API
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/employes/{id}
 * Récupère les données d'un employé selon son identifiant (matricule).
 */
export function getEmployeById(id, config = {}) {
  return api.get(employeEndpoints.getById(id), config);
}

export default api;
