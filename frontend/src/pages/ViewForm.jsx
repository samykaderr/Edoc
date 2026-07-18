import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDocumentSchema, normalizeApiData, submitDocument } from '../services/api';
import FormRenderer from '../components/FormRenderer';

function ViewForm() {
  const { schemaName } = useParams();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadSchema = async () => {
      try {
        setLoading(true);
        setError('');
        setSubmitMessage('');
        const response = await fetch(`/schema/${schemaName}.json`);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();

        if (isActive) {
          setSchema(normalizeApiData(data));
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

  const handleSubmit = async (payload) => {
    const response = await submitDocument(payload);
    const responseData = normalizeApiData(response.data);
    setSubmitMessage(responseData?.message || 'Document enregistré avec succès.');
    return responseData;
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
      ) : error ? (
        <section className="state-card state-card-error">{error}</section>
      ) : (
        <section className="form-page-body">
          {submitMessage ? <section className="state-card">{submitMessage}</section> : null}
          <FormRenderer schema={schema} onSubmit={handleSubmit} />
        </section>
      )}
    </main>
  );
}

export default ViewForm;
