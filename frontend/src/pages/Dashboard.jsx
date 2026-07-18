import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '../hooks/useDocuments';

function Dashboard() {
  const { documentTypes, loading, error } = useDocuments();
  const navigate = useNavigate();

  const handleCardClick = (documentType) => {
    navigate(`/documents?type=${documentType.schemaName}`);
  };

  return (
    <main className="app-shell desktop-only">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Tableau de bord</p>
          <h1>Mes documents</h1>
          <p className="hero-text">
            Liste complète de tous les documents gérés dans l'application.
          </p>
        </div>
        <div className="hero-status">
          <span className="status-dot" />
          <span>{documentTypes.length} document(s)</span>
        </div>
      </section>

      {loading ? (
        <section className="state-card">Chargement des documents...</section>
      ) : error ? (
        <section className="state-card state-card-error">{error}</section>
      ) : (
        <section className="cards-grid" aria-label="Types de documents">
          {documentTypes.map((documentType) => (
            <article
              key={documentType.code}
              className="document-card"
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(documentType)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleCardClick(documentType);
                }
              }}
            >
              <div className="card-topline">
                <span className="chip">{documentType.code}</span>
                <span className="schema-tag">{documentType.schemaName}</span>
              </div>
              <h2>{documentType.title}</h2>
              <p>{documentType.description}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default Dashboard;
