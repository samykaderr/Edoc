import { useState, useEffect } from 'react';

/**
 * Charge la liste des types de documents depuis /schema/registry.json.
 *
 * Pour ajouter un nouveau formulaire :
 *  1. Créez public/schema/<votre_schema>.json
 *  2. Ajoutez une entrée dans public/schema/registry.json
 *  → La carte et le formulaire apparaissent automatiquement.
 */
export function useDocuments() {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRegistry = async () => {
      try {
        setError('');
        const response = await fetch('/schema/registry.json');

        if (!response.ok) {
          throw new Error(`Impossible de charger le registre (HTTP ${response.status})`);
        }

        const registry = await response.json();
        const schemas = Array.isArray(registry.schemas) ? registry.schemas : [];

        if (isMounted) {
          setDocumentTypes(schemas);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Impossible de charger la liste des documents');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRegistry();

    return () => {
      isMounted = false;
    };
  }, []);

  return { documentTypes, loading, error };
}
