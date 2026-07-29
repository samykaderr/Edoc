import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { normalizeApiData } from '../services/api';
import { formDataService } from '../services/formDataService';
import FormRenderer from '../components/FormRenderer';

/**
 * DocumentViewPage — Page de consultation d'un document en mode lecture seule.
 *
 * Route : /view/:tableName/:id
 *
 * Comportement :
 *  1. Charge en parallèle le schéma JSON (local) et les données de la BDD.
 *  2. Pré-remplit le formulaire avec les données récupérées.
 *  3. Affiche le formulaire en mode globalReadOnly : champs désactivés, pas de bouton de soumission.
 *  4. Affiche un bouton "Retour à la liste" qui navigue vers /documents?type={tableName}.
 */
function DocumentViewPage() {
  const { tableName, id } = useParams();
  const navigate = useNavigate();

  const [schema, setSchema] = useState(null);
  const [rowData, setRowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tableName || !id) {
      setError('Paramètres de navigation manquants (tableName ou id).');
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadAll = async () => {
      try {
        setLoading(true);
        setError('');

        // Chargement en parallèle : schéma local + données BDD
        const [schemaResponse, documentData] = await Promise.all([
          fetch(`/schema/${tableName}.json`),
          formDataService.findById(tableName, id),
        ]);

        if (!schemaResponse.ok) {
          throw new Error(
            `Impossible de charger le formulaire "${tableName}" (HTTP ${schemaResponse.status}).`
          );
        }

        const schemaJson = await schemaResponse.json();
        const parsedSchema = normalizeApiData(schemaJson);

        if (isActive) {
          setSchema(parsedSchema);
          setRowData(documentData);
        }
      } catch (err) {
        if (isActive) {
          setError(err.message || 'Une erreur est survenue lors du chargement du document.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadAll();

    return () => {
      isActive = false;
    };
  }, [tableName, id]);

  const handleBackToList = () => {
    // Si l'utilisateur a un historique dans l'application, on fait un retour en arrière
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      // Fallback au cas où l'utilisateur a ouvert le lien directement dans un nouvel onglet
      navigate(`/documents?type=${tableName}`);
    }
  };

  return (
    <main className="app-shell desktop-only">

      {/* En-tête */}
      <section className="hero-panel view-form-header">
        <div className="hero-copy">
          <p className="eyebrow">Consultation — Lecture seule</p>
          <h1>{schema?.title || tableName || 'Document'}</h1>
          <p className="hero-text">
            {schema?.description || 'Affichage du document enregistré. Aucune modification possible.'}
          </p>
        </div>
        <div className="hero-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="status-dot" style={{ backgroundColor: '#1a73e8' }} />
            <span style={{ fontSize: '0.875rem', color: '#5f6368' }}>{tableName}</span>
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#1967d2',
            backgroundColor: '#e8f0fe',
            border: '1px solid #d2e3fc',
            borderRadius: '4px',
            padding: '0.2rem 0.6rem',
          }}>
            Lecture seule
          </span>
        </div>
      </section>

      {/* Bouton Retour (toujours visible) */}
      <div style={{ padding: '1rem 2rem 0', display: 'flex', justifyContent: 'flex-start' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleBackToList}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour à la liste
        </button>
      </div>

      {/* Contenu principal */}
      <section className="form-page-body">

        {loading && (
          <section className="state-card" style={{ textAlign: 'center', color: '#5f6368' }}>
            <span>⏳ Chargement du document…</span>
          </section>
        )}

        {!loading && error && (
          <section className="state-card state-card-error">
            <strong>⚠️ Erreur :</strong> {error}
          </section>
        )}

        {!loading && !error && schema && rowData && (
          <>
            {/* Bandeau informatif mode lecture */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              marginBottom: '1.5rem',
              backgroundColor: '#e8f0fe',
              border: '1px solid #d2e3fc',
              borderRadius: '8px',
              color: '#1967d2',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Ce formulaire est affiché en
              <strong style={{ marginLeft: '0.2rem' }}>lecture seule</strong>.
              Les données ne peuvent pas être modifiées depuis cette vue.
            </div>

            {/* Formulaire dynamique en mode lecture */}
            <FormRenderer
              schema={schema}
              initialData={rowData}
              globalReadOnly={true}
            />
          </>
        )}

      </section>
    </main>
  );
}

export default DocumentViewPage;
