import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getEmployeById } from '../../../services/api';

// ---------------------------------------------------------------------------
// EmployeLookup — champ idEmploye avec recherche automatique par nom+prénom
// ---------------------------------------------------------------------------

/**
 * Input spécialisé pour la recherche d'employé par ID (avec debounce).
 * Quand un employé est trouvé, il appelle onEmployeFound(employe).
 * Quand le champ est vidé ou qu'une erreur survient, onEmployeCleared().
 */
export function EmployeLookup({
  idValue,
  onIdChange,
  onEmployeFound,
  onEmployeCleared,
  lookupError,
  isRequired,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [foundLabel, setFoundLabel] = useState(null); // affiche le nom trouvé
  const abortControllerRef = useRef(null);

  const searchEmploye = useCallback(
    async (id, signal) => {
      setIsSearching(true);
      setFoundLabel(null);
      try {
        const response = await getEmployeById(id, { signal });
        const emp = response.data;
        setLocalError(null);
        // Construit le label affiché sous le champ
        const label = [emp.prenom || emp.firstName, emp.nom || emp.lastName]
          .filter(Boolean).join(' ') || `Employé #${id}`;
        setFoundLabel(label);
        onEmployeFound(emp);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        const msg = err.response?.data?.error || 'Employé introuvable.';
        setLocalError(msg);
        onEmployeCleared();
      } finally {
        if (!signal.aborted) setIsSearching(false);
      }
    },
    [onEmployeFound, onEmployeCleared],
  );

  useEffect(() => {
    if (!idValue) {
      setFoundLabel(null);
      setLocalError(null);
      onEmployeCleared();
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

  {/* const handleManualSearch = () => {
    const id = parseInt(idValue, 10);
    if (!idValue || Number.isNaN(id)) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    searchEmploye(id, controller.signal);
  };*/}

  const displayError = lookupError || localError;

  return (
    <div className="form-field">

      <div className="employe-lookup-wrapper">
        <div className="employe-lookup-input-row">
          <input
            id="idEmploye"
            name="idEmploye"
            type="number"
            step="1"
            inputMode="numeric"
            placeholder="Ex: 1042"
            value={idValue ?? ''}
            onChange={(e) => {
              onIdChange(e.target.value);
            }}
            className={displayError ? 'input-error' : foundLabel ? 'input-valid' : ''}
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

        {/* Feedback visuel */}
        {foundLabel && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#188038', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {foundLabel}
          </span>
        )}
        {displayError && <span className="field-error">{displayError}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldRenderer — rendu générique d'un champ selon son controlType
// ---------------------------------------------------------------------------

export function FieldRenderer({
  fieldName,
  field,
  controlType,
  value,
  onChange,
  error,
  isRequired = false,
  isReadOnly = false,
  formData,
}) {
  const effectiveControl = isReadOnly ? 'text' : controlType;

  const renderControl = () => {
    switch (effectiveControl) {
      case 'unsupported':
        return (
          <div className="state-card state-card-error" style={{ padding: '12px', fontSize: '0.9rem', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Champ non pris en charge
            </div>
            <div style={{ marginTop: '4px', opacity: 0.85 }}>
              Le champ <code>{fieldName}</code> utilise un type non géré par le registre.
            </div>
          </div>
        );

      case 'select':
        return (
          <select
            id={fieldName}
            name={fieldName}
            value={value ?? ''}
            onChange={(e) => onChange(fieldName, e.target.value)}
          >
            <option value="">-- Sélectionnez une option --</option>
            {field.oneOf?.map((option) => (
              <option key={option.const} value={option.const}>
                {option.title}
              </option>
            ))}
          </select>
        );

      case 'date': {
        const minDate = fieldName === 'dateFin' ? formData?.dateDebut : undefined;
        return (
          <input
            id={fieldName}
            name={fieldName}
            type="date"
            value={value ?? ''}
            min={minDate}
            onChange={(e) => !isReadOnly && onChange(fieldName, e.target.value)}
            readOnly={isReadOnly}
            onClick={(e) => !isReadOnly && e.target.showPicker?.()}
            onFocus={(e) => !isReadOnly && e.target.showPicker?.()}
          />
        );
      }

      case 'textarea':
        return (
          <textarea
            id={fieldName}
            name={fieldName}
            value={value ?? ''}
            onChange={(e) => !isReadOnly && onChange(fieldName, e.target.value)}
            readOnly={isReadOnly}
            minLength={field.minLength}
            maxLength={field.maxLength}
          />
        );

      case 'checkbox':
        return (
          <input
            id={fieldName}
            name={fieldName}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => !isReadOnly && onChange(fieldName, e.target.checked)}
            disabled={isReadOnly}
          />
        );

      default:
        let placeholder = undefined;
        if (effectiveControl === 'email' || fieldName.toLowerCase().includes('email')) {
          placeholder = "prenom.nom@soummam-dz.com";
        }
        return (
          <input
            id={fieldName}
            name={fieldName}
            type={effectiveControl}
            step={field?.type === 'integer' ? '1' : undefined}
            inputMode={field?.type === 'integer' ? 'numeric' : undefined}
            placeholder={placeholder}
            value={value ?? ''}
            readOnly={isReadOnly}
            onChange={isReadOnly ? undefined : (e) => onChange(fieldName, e.target.value)}
            className={isReadOnly ? 'input-readonly' : ''}
          />
        );
    }
  };

  return (
    <div className={`form-field${effectiveControl === 'date' ? ' half-width' : ''}`}>
      <label className="form-field-label" htmlFor={fieldName}>
        {field.title || fieldName}
        {isRequired ? <span className="form-field-required">*</span> : null}
      </label>

      {field.description ? (
        <p className="hero-text" style={{ marginTop: 0 }}>
          {field.description}
        </p>
      ) : null}

      {renderControl()}

      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// renderField — Helper principal appelé par index.jsx
// ---------------------------------------------------------------------------

/**
 * @param {string}   fieldName
 * @param {object}   property     - définition du champ JSON Schema
 * @param {*}        value        - valeur courante
 * @param {object}   formData     - état complet du formulaire (pour dateFin min)
 * @param {function} handleChange - onChange générique (synthetic event)
 * @param {object}   opts         - options supplémentaires : { onEmployeFound, onEmployeCleared, required, error }
 */
export const renderField = (fieldName, property, value, formData, handleChange, opts = {}) => {
  const { onEmployeFound, onEmployeCleared, required, error } = opts;

  // ─── Cas spécial : composant EmployeLookup pour le champ déclencheur ───
  if (fieldName === 'idEmploye') {
    return (
      <EmployeLookup
        key={fieldName}
        idValue={value ?? ''}
        isRequired={required}
        onIdChange={(newId) =>
          handleChange({ target: { name: fieldName, value: newId, type: 'number' } })
        }
        onEmployeFound={onEmployeFound ?? (() => { })}
        onEmployeCleared={onEmployeCleared ?? (() => { })}
        lookupError={error}
      />
    );
  }



  // ─── Déduction du controlType depuis le JSON Schema ───
  let controlType = 'text';
  if (property.oneOf) controlType = 'select';
  else if (property.format === 'date' || fieldName.toLowerCase().includes('date')) controlType = 'date';
  else if (property.type === 'string' && (!property.maxLength || property.maxLength > 255)) controlType = 'textarea';
  else if (property.type === 'boolean') controlType = 'checkbox';
  else if (property.type === 'integer' || property.type === 'number') controlType = 'number';
  else if (property.format === 'email') controlType = 'email';

  return (
    <FieldRenderer
      key={fieldName}
      fieldName={fieldName}
      field={property}
      controlType={controlType}
      value={value}
      onChange={handleChange}
      formData={formData}
      isReadOnly={false}
      isRequired={required}
      error={error}
    />
  );
};
