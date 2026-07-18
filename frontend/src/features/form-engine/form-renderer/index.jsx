// ---------------------------------------------------------------------------
// FormEngine/index.jsx  — Orchestrateur (haut niveau)
// Responsabilité unique : orchestrer le flux schema → state → validation → submit.
//
// Architecture Metadata-Driven (JSON Schema Draft 2020-12) :
//   FormEngine → JsonParser → renderField → DOM
//   FormEngine → buildFormErrors → Ajv → erreurs utilisateur
//   FormEngine → formDataService → /api/v1/insert
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';

import { JsonParser }          from '../parser/jsonParser';
import { getInitialValue }     from '../register';
import { buildRequiredFields } from '../expression-evaluator';
import { buildFormErrors }     from '../validator';
import { renderField }         from './render';

import '../../../components/FormRenderer.css';

// ---------------------------------------------------------------------------
// Singleton parser (pas de recréation à chaque render)
// ---------------------------------------------------------------------------
const parser = new JsonParser();

// Champs remplis automatiquement à partir de la réponse employé
const EMPLOYE_FIELD_MAP = {
  nom:     'nomEmploye',
  prenom:  'prenomEmploye',
  email:   'emailEmploye',
  // Compatibilité avec plusieurs formats de réponse backend :
  lastName:  'nomEmploye',
  firstName: 'prenomEmploye',
};

// ---------------------------------------------------------------------------
// FormEngine
// ---------------------------------------------------------------------------

/**
 * Main form engine orchestrator.
 *
 * @param {object}        props
 * @param {object|string} props.schema    - JSON Schema Draft 2020-12 (objet ou string JSON).
 * @param {function}      props.onSubmit  - Async submit handler: (payload) => Promise<any>
 */
function FormEngine({ schema, onSubmit }) {
  const [formData,     setFormData]     = useState({});
  const [errors,       setErrors]       = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError,  setSubmitError]  = useState('');

  // Parse le schéma (objet ou string JSON) — null si invalide
  let resolvedSchema = null;
  try {
    resolvedSchema = schema ? parser.parse(schema) : null;
  } catch {
    resolvedSchema = null;
  }

  const properties = resolvedSchema?.properties || {};

  // Clé stable pour useEffect : évite la boucle infinie due à la
  // ré-instanciation d'objet à chaque render
  const schemaKey = schema
    ? (typeof schema === 'string' ? schema : JSON.stringify(schema))
    : '';

  // --- Initialise les données du formulaire quand le schéma change ---
  useEffect(() => {
    if (!schemaKey) {
      setFormData({});
      return;
    }
    let parsed = null;
    try {
      parsed = parser.parse(schema);
    } catch {
      return;
    }
    if (!parsed?.properties) return;

    const nextData = {};
    Object.keys(parsed.properties).forEach((fieldName) => {
      nextData[fieldName] = getInitialValue(parsed.properties[fieldName]);
    });
    setFormData(nextData);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaKey]);

  // --- Callback : employé trouvé — remplit les champs readOnly automatiquement ---
  const handleEmployeFound = useCallback((employe) => {
    if (!employe) return;
    setFormData((prev) => {
      const next = { ...prev };
      // On mappe les clés de la réponse API vers les champs du schéma
      Object.entries(EMPLOYE_FIELD_MAP).forEach(([apiKey, fieldName]) => {
        if (employe[apiKey] !== undefined) {
          next[fieldName] = employe[apiKey];
        }
      });
      return next;
    });
  }, []);

  // --- Callback : employé effacé — vide les champs readOnly ---
  const handleEmployeCleared = useCallback(() => {
    setFormData((prev) => {
      const next = { ...prev };
      Object.values(EMPLOYE_FIELD_MAP).forEach((fieldName) => {
        next[fieldName] = '';
      });
      return next;
    });
  }, []);

  // --- Gestionnaire générique de changement de champ ---
  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target;
    const targetValue = type === 'number' ? (parseInt(value, 10) || '') : value;
    setFormData((prev) => ({ ...prev, [name]: targetValue }));
    // Efface l'erreur du champ dès que l'utilisateur le modifie
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, [errors]);

  // --- Validation du formulaire ---
  const validateForm = useCallback(() => {
    const requiredFields = buildRequiredFields(resolvedSchema, formData);
    const { errors: nextErrors, isValid } = buildFormErrors(
      properties,
      formData,
      requiredFields,
      { employeFound: true, lookupFilledFields: new Set(), lookupTriggerField: null },
    );
    setErrors(nextErrors);
    return isValid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedSchema, formData]);

  // --- Soumission du formulaire ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    // Coerce les valeurs vers leurs types corrects avant envoi
    const payload = {};
    Object.entries(properties).forEach(([fieldName, field]) => {
      const value = formData[fieldName];
      if (value === '' || value === null || value === undefined) return;
      if (field?.type === 'integer') { payload[fieldName] = Number.parseInt(value, 10); return; }
      if (field?.type === 'number')  { payload[fieldName] = Number(value);              return; }
      if (field?.type === 'boolean') { payload[fieldName] = Boolean(value);             return; }
      payload[fieldName] = value;
    });

    try {
      setIsSubmitting(true);
      if (typeof onSubmit === 'function') {
        await onSubmit(payload);
      }
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error || err?.message || "La validation ou l'enregistrement a échoué.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Guard : pas de schéma valide ---
  if (!resolvedSchema) {
    return <p>Aucune structure de formulaire disponible.</p>;
  }

  // Construit un tableau des erreurs pour l'affichage
  const errorList = Object.values(errors).filter(Boolean);

  // --- Rendu ---
  return (
    <div className="form-renderer">
      <div className="form-renderer-header">
        <h2>{resolvedSchema.title || 'Remplir le formulaire'}</h2>
        <p>{resolvedSchema.description || 'Veuillez compléter les informations demandées pour ce document.'}</p>
      </div>

      {submitError ? <div className="state-card state-card-error">{submitError}</div> : null}

      {/* Affichage des erreurs de validation */}
      {errorList.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fce8e6', borderRadius: '8px', color: '#c5221f' }}>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {errorList.map((err, idx) => <li key={idx}>{err}</li>)}
          </ul>
        </div>
      )}

      <form className="form-grid" onSubmit={handleSubmit}>
        {/* Boucle sur toutes les propriétés du JSON Schema */}
        <div className="form-fields">
          {Object.keys(properties).map((fieldName) =>
            renderField(
              fieldName,
              properties[fieldName],
              formData[fieldName],
              formData,
              handleChange,
              // Passe les callbacks lookup uniquement pour le champ déclencheur
              {
                onEmployeFound:   handleEmployeFound,
                onEmployeCleared: handleEmployeCleared,
                required: resolvedSchema.required?.includes(fieldName),
                error: errors[fieldName],
              },
            )
          )}
        </div>

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
