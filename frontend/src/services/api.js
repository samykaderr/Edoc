import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE?.trim() || '/api',
});

export const documentEndpoints = {
  list: '/documents',
  schema: (schemaName) => `/documents/schemas/${encodeURIComponent(schemaName)}`,
  submit: '/documents/soumettre',
};

export const employeEndpoints = {
  getById: (id) => `/employes/${encodeURIComponent(id)}`,
};

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

export function getDocumentTypes() {
  return api.get(documentEndpoints.list);
}

export function getDocumentSchema(schemaName) {
  return api.get(documentEndpoints.schema(schemaName));
}

export function submitDocument(payload) {
  console.log(payload);
  return api.post(documentEndpoints.submit, payload);
}

export function getEmployeById(id, config = {}) {
  return api.get(employeEndpoints.getById(id), config);
}

export default api;
