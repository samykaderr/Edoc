import React from 'react';

function FormRenderer() {
  return (
    <div className="form-renderer">
      <div className="form-renderer-header">
        <h2 className="skeleton-block skeleton-title">Formulaire vide</h2>
        <p className="skeleton-block skeleton-line skeleton-line-wide">Aucun champ n'est affiché pour le moment.</p>
      </div>

      <form className="form-grid" aria-label="Aperçu du formulaire vide">
        <div className="form-field">
          <span className="form-field-label skeleton-block skeleton-line skeleton-line-medium">Champ 1</span>
          <div className="skeleton-input" />
        </div>

        <div className="form-field">
          <span className="form-field-label skeleton-block skeleton-line skeleton-line-medium">Champ 2</span>
          <div className="skeleton-input" />
        </div>

        <div className="form-field">
          <span className="form-field-label skeleton-block skeleton-line skeleton-line-medium">Champ 3</span>
          <div className="skeleton-input skeleton-input-large" />
        </div>

        <div className="form-actions">
          <div className="skeleton-button" />
        </div>
      </form>
    </div>
  );
}

export default FormRenderer;
