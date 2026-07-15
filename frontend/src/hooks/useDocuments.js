import { useState, useEffect } from 'react';
import { getDocumentTypes } from '../services/api';

export function useDocuments() {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDocumentTypes = async () => {
      try {
        setError('');
        const response = await getDocumentTypes();

        if (isMounted) {
          setDocumentTypes(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || err.message || 'Impossible de charger la liste des documents');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDocumentTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  return { documentTypes, loading, error };
}
