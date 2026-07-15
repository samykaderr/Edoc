import { useState, useEffect } from 'react';
import api from '../services/api';

export function useDocuments() {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDocumentTypes = async () => {
      try {
        setError('');
        const response = await api.get('/documents');
        setDocumentTypes(response.data);
      } catch (err) {
        setError(err.message || 'Impossible de charger la liste des documents');
      } finally {
        setLoading(false);
      }
    };

    loadDocumentTypes();
  }, []);

  return { documentTypes, loading, error };
}
