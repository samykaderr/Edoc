import { useState, useEffect } from 'react';
// 🟢 Importation de ton validateur d'en-tête strict
import { isValidSchemaStructure } from '../features/form-engine/expression-evaluator';

/**
 * Charge la liste des types de documents depuis /schema/registry.json
 * et valide l'intégrité structurelle de chaque fichier JSON à la source.
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

        // 🟢 ÉTAPE DE SÉCURITÉ ACTIVE : On va inspecter chaque fichier de schéma en arrière-plan
        const validationPromises = schemas.map(async (entry) => {
          try {
            // On tente de charger le vrai fichier JSON associé à cette entrée
            const schemaResponse = await fetch(`/schema/${entry.schemaName}.json`);
            if (!schemaResponse.ok) return null; // Fichier introuvable = rejeté

            const fullSchema = await schemaResponse.json();

            // 🔥 On passe le schéma au détecteur d'en-tête strict
            // Si le fichier est vide, n'a pas de documentType ou pas de propriétés -> Rejeté !
            if (isValidSchemaStructure(fullSchema)) {
              return entry; // Le schéma est 100% conforme, on le garde
            }
          } catch (err) {
            console.error(`Le schéma pour "${entry.schemaName}" est corrompu ou illisible.`, err);
          }
          return null; // En cas d'erreur ou d'invalidation, on retourne null
        });

        // Attente de la validation de tous les fichiers en parallèle (très rapide)
        const resolvedSchemas = await Promise.all(validationPromises);
        
        // On élimine tous les schémas qui ont été rejetés (les valeurs null)
        const filteredSchemas = resolvedSchemas.filter(item => item !== null);

        if (isMounted) {
          setDocumentTypes(filteredSchemas);
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