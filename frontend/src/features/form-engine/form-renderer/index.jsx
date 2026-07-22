
// ---------------------------------------------------------------------------
// FormEngine/index.jsx  — Orchestrateur (haut niveau)
// Responsabilité unique : orchestrer le flux schema → state → validation → submit.
// Ce composant ne contient AUCUNE logique métier propre — il délègue à chaque
// module spécialisé.
//
// Principe D (Dependency Inversion) :
//   FormEngine → formDataService → api.js (Axios)
//   (haut niveau)  (abstraction)  (bas niveau)
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';

import { JsonParser } from '../parser/jsonParser';

const parser = new JsonParser();
import { getFieldControl, getInitialValue } from '../register';
import { buildRequiredFields } from '../expression-evaluator';
import { validateFormData } from '../validator/validationManager';
import { FieldRenderer } from './render';

import '../../../components/FormRenderer.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------



// ---------------------------------------------------------------------------
// FormEngine
// ---------------------------------------------------------------------------

/*
 * Main form engine orchestrator.
 *
 * @param {object}   props
 * @param {object|string} props.schema   - JSON Schema (object or raw JSON string).
 * @param {function} props.onSubmit      - Async submit handler: (payload) => Promise<any>
 */
function FormEngine({ schema, onSubmit }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  let resolvedSchema = null;
  try {
    resolvedSchema = schema ? parser.parse(schema) : null;
  } catch {
    resolvedSchema = null;
  }
  const properties = resolvedSchema?.properties || {};

  // --- Initialise form data whenever schema changes ---
  useEffect(() => {
    if (!resolvedSchema) {
      setFormData({});
      return;
    }
    const nextData = { num_doc: '' };
    Object.keys(properties).forEach((fieldName) => {
      if (fieldName !== 'idEmploye' && fieldName !== 'id_employe') {
        nextData[fieldName] = getInitialValue(properties[fieldName]);
      }
    });
    setFormData(nextData);
    setErrors({});
  }, [resolvedSchema]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Generic field change handler ---
  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };



  // --- Form validation (delegates to validationManager) ---
  const validateForm = () => {
    const requiredFields = buildRequiredFields(resolvedSchema, formData);
    const { errors: nextErrors, isValid } = validateFormData(
      resolvedSchema,
      formData,
      requiredFields
    );
    setErrors(nextErrors);
    return isValid;
  };

  // --- Submit handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    // Coerce values to their correct types before submission
    const payload = { num_doc: formData.num_doc };
    Object.entries(properties).forEach(([fieldName, field]) => {
      if (fieldName === 'idEmploye' || fieldName === 'id_employe') return;
      const value = formData[fieldName];
      if (value === '' || value === null || value === undefined) return;
      if (field?.type === 'integer') { payload[fieldName] = Number.parseInt(value, 10); return; }
      if (field?.type === 'number') { payload[fieldName] = Number(value); return; }
      if (field?.type === 'boolean') { payload[fieldName] = Boolean(value); return; }
      payload[fieldName] = value;
    });

    try {
      setIsSubmitting(true);
      if (typeof onSubmit === 'function') {
        await onSubmit(payload);
      }
    } catch (err) {
      setSubmitError(
        err.response?.data?.error || err.message || "La validation ou l'enregistrement a échoué.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Guard: no schema ---
  if (!resolvedSchema) {
    return <p>Aucune structure de formulaire disponible.</p>;
  }

  // --- Render ---
  return (
    <div className="form-renderer">
      {/*
      <div className="form-renderer-header">
        <h2>{resolvedSchema.title || 'Remplir le formulaire'}</h2>
        <p>{resolvedSchema.description || 'Veuillez compléter les informations demandées pour ce document.'}</p>
      </div>*/}

      {submitError ? <div className="state-card state-card-error">{submitError}</div> : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-field-label" htmlFor="num_doc">
            Numéro DOC
          </label>
          <input
            id="num_doc"
            name="num_doc"
            type="text"
            value={formData.num_doc ?? ''}
            onChange={(e) => handleInputChange('num_doc', e.target.value)}
          />
        </div>

        {Object.keys(properties).map((fieldName) => {
          if (fieldName === 'idEmploye' || fieldName === 'id_employe') return null;
          const field = properties[fieldName];
          const requiredFields = buildRequiredFields(resolvedSchema, formData);
          const isRequired = requiredFields.has(fieldName);

          // --- Generic fields (delegates to LayoutRenderer) ---
          const controlType = getFieldControl(field, fieldName);
          return (
            <FieldRenderer
              key={fieldName}
              fieldName={fieldName}
              field={field}
              controlType={controlType}
              value={formData[fieldName]}
              onChange={handleInputChange}
              error={errors[fieldName]}
              isRequired={isRequired}
              isReadOnly={false}
            />
          );
        })}

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting} className="form-submit-button">
            {isSubmitting ? 'Envoi en cours...' : 'Soumettre le document'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormEngine;
