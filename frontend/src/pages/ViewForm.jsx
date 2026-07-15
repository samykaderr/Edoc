import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import FormRenderer from '../components/FormRenderer';

function ViewForm() {
  const { id } = useParams();
  const [documentType, setDocumentType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadDocumentType = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/documents/${id}`);

        if (isActive) {
          setDocumentType(response.data);
        }
      } catch (err) {
        if (isActive) {
          setError(err.message || 'Impossible de charger le formulaire');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadDocumentType();

    return () => {
      isActive = false;
    };
  }, [id]);

  const schema = documentType?.schema || documentType?.formSchema || documentType?.fields || documentType;

  return (
    <main className="app-shell desktop-only">
      <section className="hero-panel view-form-header">
        <div className="hero-copy">
          <p className="eyebrow">Formulaire</p>
          <h1>{documentType?.title || 'Consulter le formulaire'}</h1>
          <p className="hero-text">
            {documentType?.description || 'Chargement du formulaire associé au document sélectionné.'}
          </p>
        </div>
        <div className="hero-status">
          <span className="status-dot" />
          <span>{id}</span>
        </div>
      </section>

      {loading ? (
        <section className="state-card">Chargement du formulaire...</section>
      ) : error ? (
        <section className="state-card state-card-error">{error}</section>
      ) : (
        <section className="form-page-body">
          <FormRenderer schema={schema} />
        </section>
      )}
    </main>
  );
}

export default ViewForm;
