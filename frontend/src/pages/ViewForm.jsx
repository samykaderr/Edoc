import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { normalizeApiData } from '../services/api';
import { formDataService } from '../services/formDataService';
import { JsonParser } from '../features/form-engine/parser/jsonParser';
import FormRenderer from '../components/FormRenderer';

function ViewForm() {
  const { schemaName } = useParams();
  const navigate = useNavigate();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState('EDITING'); // 'EDITING' | 'REVIEW' | 'SUCCESS'
  const [savedFormData, setSavedFormData] = useState(null);
  const [finalPayload, setFinalPayload] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSchema = async () => {
      try {
        setLoading(true);
        setError('');
        setSubmitMessage('');

        // ✅ Étape 1 : Charger le JSON LOCALEMENT (source de vérité visuelle)
        const response = await fetch(`/schema/${schemaName}.json`);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        const localSchema = normalizeApiData(data);

        // ✅ Étape 2 : Envoyer le JSON au Backend pour garantir que la table SQL existe (Auto-Sync)
        // Non-bloquant : un échec du sync ne doit JAMAIS empêcher l'affichage du formulaire
        formDataService.syncSchema(schemaName, data).catch((syncErr) => {
          console.warn('[ViewForm] syncSchema non-critique échoué :', syncErr.message);
        });

        // ✅ Étape 3 : Afficher le formulaire avec le JSON LOCAL (pas la réponse du serveur)
        if (isActive) {
          setSchema(localSchema);
        }
      } catch (err) {
        if (isActive) {
          setError(err.response?.data?.error || err.message || 'Impossible de charger le formulaire');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadSchema();

    return () => {
      isActive = false;
    };
  }, [schemaName]);

  const handleVerify = async (payload, rawFormData) => {
    setSavedFormData(rawFormData);
    setFinalPayload(payload);
    setStep('REVIEW');
    window.scrollTo(0, 0);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    // Task 3.2 fix : setError n'est plus appelé avant le try (ce qui causait un flash
    // de message d'erreur avant même que la requête soit émise).
    try {
      const parser = new JsonParser();
      const mysqlPayload = parser.toMysqlPayload(schema);
      const tableName = mysqlPayload.tableName;

      const dataToInsert = {
        ...finalPayload,
        statut: 'nouveau'
      };

      await formDataService.insert(tableName, dataToInsert);
      setError(''); // Réinitialise toute erreur précédente en cas de succès
      setSubmitMessage("Demande enregistrée avec succès sous le statut 'nouveau' !");
      setStep('SUCCESS');
      window.scrollTo(0, 0);
    } catch (err) {
      // Task 3.2 fix : L'erreur est affichée que si une exception est réellement levée
      setError(err.message || 'Erreur lors de l\'enregistrement en base de données.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="app-shell desktop-only">
      <section className="hero-panel view-form-header">
        <div className="hero-copy">
          <p className="eyebrow">Formulaire</p>
          <h1>{schema?.title || 'Consulter le formulaire'}</h1>
          <p className="hero-text">
            {schema?.description || 'Chargement du formulaire associé au document sélectionné.'}
          </p>
        </div>
        <div className="hero-status">
          <span className="status-dot" />
          <span>{schemaName}</span>
        </div>
      </section>

      {loading ? (
        <section className="state-card">Chargement du formulaire...</section>
      ) : step === 'SUCCESS' ? (
        <section className="form-page-body">
          <section className="state-card" style={{ backgroundColor: '#e6f4ea', color: '#137333', borderColor: '#ceead6' }}>
            <h3>✅ Succès</h3>
            <p>{submitMessage}</p>
            <button onClick={() => window.location.reload()} className="btn btn-secondary mt-3">Nouvelle demande</button>
          </section>
        </section>
      ) : (
        <section className="form-page-body">
          {error && <section className="state-card state-card-error">{error}</section>}

          {step === 'REVIEW' && (
            <div className="state-card" style={{ marginBottom: '2rem', backgroundColor: '#e8f0fe', borderColor: '#d2e3fc', color: '#1967d2' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span role="img" aria-label="clipboard">📋</span>
                Récapitulatif de votre demande
              </h3>
              <p style={{ margin: '0.5rem 0 0 0' }}>Veuillez relire vos informations avant validation définitive.</p>
            </div>
          )}

          <FormRenderer
            schema={schema}
            onSubmit={handleVerify}
            initialData={savedFormData}
            globalReadOnly={step === 'REVIEW'}
            submitLabel="Vérifier et Prévisualiser"
          />

          {step === 'REVIEW' && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end', padding: '1rem', borderTop: '1px solid #eee' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('EDITING')}
                disabled={isSubmitting}
              >
                <span role="img" aria-label="pencil">✏️</span> Retourner à l'édition
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enregistrement...' : '✅ Confirmer et Enregistrer'}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default ViewForm;
