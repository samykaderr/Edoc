import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getEmployeById } from '../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSchema(schema) {
  if (!schema || typeof schema !== 'string') {
    return schema;
  }
  try {
    return JSON.parse(schema);
  } catch {
    return null;
  }
}

function getInitialValue(field) {
  if (field?.default !== undefined) {
    return field.default;
  }
  if (field?.type === 'boolean') {
    return false;
  }
  return '';
}

function getFieldControl(field) {
  if (!field) return 'text';
  if (field.enum) return 'select';
  if (field.format === 'date') return 'date';
  if (field.type === 'boolean') return 'checkbox';
  if (field.type === 'integer' || field.type === 'number') return 'number';
  if (field.type === 'string' && typeof field.maxLength === 'number' && field.maxLength > 120) return 'textarea';
  return 'text';
}

function buildRequiredFields(schema, values) {
  const requiredFields = new Set(schema?.required || []);

  if (!Array.isArray(schema?.allOf)) {
    return requiredFields;
  }

  schema.allOf.forEach((rule) => {
    const conditionProperties = rule?.if?.properties || {};
    const conditionEntries = Object.entries(conditionProperties);

    if (conditionEntries.length === 0) return;

    const isMatch = conditionEntries.every(
      ([fieldName, condition]) => values[fieldName] === condition?.const,
    );

    if (isMatch && Array.isArray(rule?.then?.required)) {
      rule.then.required.forEach((fieldName) => requiredFields.add(fieldName));
    }
  });

  return requiredFields;
}

function validateField(field, value, isRequired) {
  const errors = [];
  const valueAsString = value === null || value === undefined ? '' : String(value).trim();

  if (isRequired && valueAsString === '') {
    errors.push('Ce champ est requis.');
    return errors;
  }

  if (valueAsString === '') return errors;

  if (field?.type === 'integer' || field?.type === 'number') {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      errors.push('Veuillez saisir une valeur numérique valide.');
      return errors;
    }
    if (field.type === 'integer' && !Number.isInteger(numericValue)) {
      errors.push('Veuillez saisir un nombre entier.');
      return errors;
    }
  }

  if (typeof field?.minLength === 'number' && valueAsString.length < field.minLength) {
    errors.push(`La longueur minimale est de ${field.minLength} caractères.`);
  }

  if (typeof field?.maxLength === 'number' && valueAsString.length > field.maxLength) {
    errors.push(`La longueur maximale est de ${field.maxLength} caractères.`);
  }

  if (field?.pattern) {
    const pattern = new RegExp(field.pattern);
    if (!pattern.test(valueAsString)) {
      errors.push('Le format de la valeur est invalide.');
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// EmployeLookup — champ idEmploye avec recherche auto nom+prénom
// ---------------------------------------------------------------------------

function EmployeLookup({ idValue, onIdChange, onEmployeFound, onEmployeCleared, lookupError }) {
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef(null);

  const searchEmploye = useCallback(async (id, signal) => {
    setIsSearching(true);
    try {
      const response = await getEmployeById(id, { signal });
      onEmployeFound(response.data);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      onEmployeCleared(err.response?.data?.error || 'Employé introuvable.');
    } finally {
      if (!signal.aborted) {
        setIsSearching(false);
      }
    }
  }, [onEmployeFound, onEmployeCleared]);

  useEffect(() => {
    if (!idValue) {
      onEmployeCleared(null);
      return;
    }
    const id = parseInt(idValue, 10);
    if (Number.isNaN(id)) return;

    const timer = setTimeout(() => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      searchEmploye(id, controller.signal);
    }, 600);

    return () => {
      clearTimeout(timer);
      abortControllerRef.current?.abort();
    };
  }, [idValue, onEmployeCleared, searchEmploye]);

  const handleManualSearch = () => {
    const id = parseInt(idValue, 10);
    if (!idValue || Number.isNaN(id)) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    searchEmploye(id, controller.signal);
  };

  return (
    <div className="employe-lookup-wrapper">
      <div className="employe-lookup-input-row">
        <input
          id="idEmploye"
          type="number"
          step="1"
          inputMode="numeric"
          placeholder="Ex: 1042"
          value={idValue}
          onChange={(e) => {
            onEmployeCleared(null);
            onIdChange(e.target.value);
          }}
          className={lookupError ? 'input-error' : ''}
        />
        <button
          type="button"
          className="lookup-btn"
          disabled={isSearching || !idValue}
          onClick={handleManualSearch}
          aria-label="Rechercher l'employé"
        >
          {isSearching ? (
            <span className="lookup-spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </button>
      </div>
      {lookupError && (
        <span className="field-error">{lookupError}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormRenderer principal
// ---------------------------------------------------------------------------

// Champs auto-remplis par le lookup — jamais saisis manuellement
const LOOKUP_FILLED_FIELDS = new Set(['nomEmploye', 'prenomEmploye', 'emailEmploye']);
// Champ déclencheur du lookup
const LOOKUP_TRIGGER_FIELD = 'idEmploye';

function FormRenderer({ schema, onSubmit }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lookupError, setLookupError] = useState(null);
  const [employeFound, setEmployeFound] = useState(false);

  const resolvedSchema = parseSchema(schema);
  const properties = resolvedSchema?.properties || {};

  useEffect(() => {
    if (!resolvedSchema) {
      setFormData({});
      return;
    }
    const nextData = {};
    Object.keys(properties).forEach((fieldName) => {
      nextData[fieldName] = getInitialValue(properties[fieldName]);
    });
    setFormData(nextData);
    setErrors({});
    setEmployeFound(false);
    setLookupError(null);
  }, [resolvedSchema]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Appelé quand l'API employe répond avec succès
  const handleEmployeFound = useCallback((employe) => {
    setEmployeFound(true);
    setLookupError(null);
    setFormData((prev) => ({
      ...prev,
      nomEmploye: employe.nom || '',
      prenomEmploye: employe.prenom || '',
      emailEmploye: employe.email || '',
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.nomEmploye;
      delete next.prenomEmploye;
      delete next.emailEmploye;
      return next;
    });
  }, []);

  // Appelé quand l'ID est effacé ou introuvable
  const handleEmployeCleared = useCallback((errorMsg) => {
    setEmployeFound(false);
    setLookupError(errorMsg || null);
    setFormData((prev) => ({
      ...prev,
      nomEmploye: '',
      prenomEmploye: '',
      emailEmploye: '',
    }));
  }, []);

  const validateForm = () => {
    const nextErrors = {};
    const requiredFields = buildRequiredFields(resolvedSchema, formData);

    // Valider que l'employé a bien été résolu
    if (properties[LOOKUP_TRIGGER_FIELD] && !formData[LOOKUP_TRIGGER_FIELD]) {
      nextErrors[LOOKUP_TRIGGER_FIELD] = 'Ce champ est requis.';
    } else if (formData[LOOKUP_TRIGGER_FIELD] && !employeFound) {
      nextErrors[LOOKUP_TRIGGER_FIELD] = 'Veuillez rechercher un employé valide.';
    }

    Object.entries(properties).forEach(([fieldName, field]) => {
      if (fieldName === LOOKUP_TRIGGER_FIELD) return; // déjà traité
      if (LOOKUP_FILLED_FIELDS.has(fieldName)) return; // auto-remplis, pas validés manuellement
      const fieldErrors = validateField(field, formData[fieldName], requiredFields.has(fieldName));
      if (fieldErrors.length > 0) {
        nextErrors[fieldName] = fieldErrors[0];
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    const payload = {};
    Object.entries(properties).forEach(([fieldName, field]) => {
      const value = formData[fieldName];
      if (value === '' || value === null || value === undefined) return;
      if (field?.type === 'integer') {
        payload[fieldName] = Number.parseInt(value, 10);
        return;
      }
      if (field?.type === 'number') {
        payload[fieldName] = Number(value);
        return;
      }
      if (field?.type === 'boolean') {
        payload[fieldName] = Boolean(value);
        return;
      }
      payload[fieldName] = value;
    });

    try {
      setIsSubmitting(true);
      if (typeof onSubmit === 'function') {
        await onSubmit(payload);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.message || "La validation ou l'enregistrement a échoué.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resolvedSchema) {
    return <p>Aucune structure de formulaire disponible.</p>;
  }

  return (
    <div className="form-renderer">
      <div className="form-renderer-header">
        <h2>{resolvedSchema.title || 'Remplir le formulaire'}</h2>
        <p>{resolvedSchema.description || 'Veuillez compléter les informations demandées pour ce document.'}</p>
      </div>

      {submitError ? <div className="state-card state-card-error">{submitError}</div> : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        {Object.keys(properties).map((fieldName) => {
          const field = properties[fieldName];
          const requiredFields = buildRequiredFields(resolvedSchema, formData);
          const isRequired = requiredFields.has(fieldName);
          const isReadOnly = field?.readOnly === true;

          // --- Champ déclencheur du lookup d'employé ---
          if (fieldName === LOOKUP_TRIGGER_FIELD) {
            return (
              <div className="form-field" key={fieldName}>
                <label className="form-field-label" htmlFor={fieldName}>
                  {field.title || fieldName}
                  {isRequired ? <span className="form-field-required">*</span> : null}
                </label>
                {field.description ? (
                  <p className="hero-text" style={{ marginTop: 0, marginBottom: '0.4rem' }}>
                    {field.description}
                  </p>
                ) : null}
                <EmployeLookup
                  idValue={formData[fieldName] ?? ''}
                  onIdChange={(value) => handleInputChange(fieldName, value)}
                  onEmployeFound={handleEmployeFound}
                  onEmployeCleared={handleEmployeCleared}
                  lookupError={errors[fieldName] || lookupError}
                />
                {employeFound && (
                  <span className="employe-found-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Employé trouvé
                  </span>
                )}
              </div>
            );
          }

          // --- Champs auto-remplis (nom, prénom) — lecture seule ---
          if (LOOKUP_FILLED_FIELDS.has(fieldName)) {
            return (
              <div className="form-field" key={fieldName}>
                <label className="form-field-label" htmlFor={fieldName}>
                  {field.title || fieldName}
                </label>
                <input
                  id={fieldName}
                  type="text"
                  value={formData[fieldName] ?? ''}
                  readOnly
                  tabIndex={-1}
                  className="input-readonly"
                  placeholder="Sera rempli automatiquement"
                />
              </div>
            );
          }

          // --- Champs normaux ---
          const controlType = isReadOnly ? 'text' : getFieldControl(field);

          return (
            <div className="form-field" key={fieldName}>
              <label className="form-field-label" htmlFor={fieldName}>
                {field.title || fieldName}
                {isRequired ? <span className="form-field-required">*</span> : null}
              </label>

              {field.description ? (
                <p className="hero-text" style={{ marginTop: 0 }}>{field.description}</p>
              ) : null}

              {controlType === 'select' ? (
                <select
                  id={fieldName}
                  value={formData[fieldName] ?? ''}
                  onChange={(e) => handleInputChange(fieldName, e.target.value)}
                >
                  <option value="">-- Sélectionnez une option --</option>
                  {field.enum.map((option, index) => (
                    <option key={option} value={option}>
                      {Array.isArray(field.enumTitles) && field.enumTitles[index]
                        ? field.enumTitles[index]
                        : option}
                    </option>
                  ))}
                </select>
              ) : controlType === 'date' ? (
                <input
                  id={fieldName}
                  type="date"
                  value={formData[fieldName] ?? ''}
                  onChange={(e) => handleInputChange(fieldName, e.target.value)}
                />
              ) : controlType === 'textarea' ? (
                <textarea
                  id={fieldName}
                  value={formData[fieldName] ?? ''}
                  onChange={(e) => handleInputChange(fieldName, e.target.value)}
                />
              ) : controlType === 'checkbox' ? (
                <input
                  id={fieldName}
                  type="checkbox"
                  checked={Boolean(formData[fieldName])}
                  onChange={(e) => handleInputChange(fieldName, e.target.checked)}
                />
              ) : (
                <input
                  id={fieldName}
                  type={controlType}
                  step={field?.type === 'integer' ? '1' : undefined}
                  inputMode={field?.type === 'integer' ? 'numeric' : undefined}
                  value={formData[fieldName] ?? ''}
                  readOnly={isReadOnly}
                  onChange={(e) => !isReadOnly && handleInputChange(fieldName, e.target.value)}
                  className={isReadOnly ? 'input-readonly' : ''}
                />
              )}

              {errors[fieldName] ? (
                <span className="field-error">{errors[fieldName]}</span>
              ) : null}
            </div>
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

export default FormRenderer;