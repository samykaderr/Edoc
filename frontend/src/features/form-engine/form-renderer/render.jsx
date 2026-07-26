import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getEmployeById } from '../../../services/api';
import { getFieldControl } from '../register';


// ---------------------------------------------------------------------------
// EmployeLookup — champ idEmploye avec recherche automatique par nom+prénom
// ---------------------------------------------------------------------------

/**
 * Input spécialisé pour la recherche d'employé par ID (avec debounce et bouton manuel).
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
  isReadOnly = false,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [foundLabel, setFoundLabel] = useState(null);
  const abortControllerRef = useRef(null);

  const searchEmploye = useCallback(
    async (id, signal) => {
      setIsSearching(true);
      setFoundLabel(null);
      try {
        const response = await getEmployeById(id, { signal });
        const emp = response.data;
        setLocalError(null);

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

  // Recherche manuelle declenchee par le bouton loupe
  const handleManualSearch = () => {
    const id = parseInt(idValue, 10);
    if (!idValue || Number.isNaN(id)) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    searchEmploye(id, controller.signal);
  };

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
            onChange={isReadOnly ? undefined : (e) => onIdChange(e.target.value)}
            readOnly={isReadOnly}
            className={`${displayError ? 'input-error' : foundLabel ? 'input-valid' : ''} ${isReadOnly ? 'input-readonly' : ''}`.trim()}
          />
          {!isReadOnly && (
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
          )}
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
        const minDate = fieldName.endsWith('dateFin') ? formData?.dateDebut : undefined;
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
 * @param {object}   formData     - état complet du formulaire
 * @param {function} handleChange - onChange générique
 * @param {object}   opts         - options supplémentaires
 */
export const renderField = (fieldName, property, value, formData, handleChange, opts = {}) => {
  const { onEmployeFound, onEmployeCleared, required, error, pathPrefix = '', fieldStates = {}, allErrors = {}, globalReadOnly = false } = opts;
  // Bug #2 fix : Séparateur underscore `_` pour les chemins imbriqués (cohérence DDL SQL)
  const currentPath = pathPrefix ? `${pathPrefix}_${fieldName}` : fieldName;

  // Masquer le champ s'il est caché
  if (fieldStates[currentPath]?.isHidden) {
    return null;
  }

  const isReadOnly = globalReadOnly || fieldStates[currentPath]?.isReadOnly || false;
  const isRequired = required?.has ? required.has(currentPath) : !!required;

  // Cas des groupes (Fieldset)
  if (property.type === 'object') {
    return (
      <fieldset className="form-group" key={currentPath} style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        {property.title && <legend style={{ fontWeight: 'bold', padding: '0 5px' }}>{property.title}</legend>}
        {property.properties && Object.keys(property.properties).map(childName => {
          const childProp = property.properties[childName];
          // Bug #2 fix : Séparateur underscore `_` pour les chemins imbriqués (cohérence DDL SQL)
          const childPath = `${currentPath}_${childName}`;
          return renderField(childName, childProp, formData[childPath], formData, handleChange, {
            ...opts,
            pathPrefix: currentPath,
            error: allErrors[childPath]
          });
        })}
      </fieldset>
    );
  }

  // Cas spécial : composant EmployeLookup pour idEmploye ou id_employe
  if (currentPath === 'idEmploye' || currentPath === 'id_employe') {
    return (
      <EmployeLookup
        key={currentPath}
        idValue={value ?? ''}
        isRequired={isRequired}
        isReadOnly={isReadOnly}
        onIdChange={(newId) =>
          handleChange({ target: { name: currentPath, value: newId, type: 'number' } })
        }
        onEmployeFound={onEmployeFound ?? (() => { })}
        onEmployeCleared={onEmployeCleared ?? (() => { })}
        lookupError={error}
      />
    );
  }

  // Déduction du controlType centralisée depuis le registre (register/index.js)
  // Gère : select, date, checkbox, number, textarea, text, email, unsupported
  const controlType = getFieldControl(property, fieldName);

  const wrappedOnChange = (name, val) => {
    handleChange({ target: { name: currentPath, value: val, type: controlType === 'checkbox' ? 'checkbox' : undefined, checked: controlType === 'checkbox' ? val : undefined } });
  };

  return (
    <FieldRenderer
      key={currentPath}
      fieldName={currentPath}
      field={property}
      controlType={controlType}
      value={value}
      onChange={wrappedOnChange}
      formData={formData}
      isReadOnly={isReadOnly}
      isRequired={isRequired}
      error={error}
    />
  );
};