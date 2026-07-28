// ---------------------------------------------------------------------------
// FormEngine/index.jsx — Orchestrateur (haut niveau)
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';
import { JsonParser } from '../parser/jsonParser';
import { getFieldControl, getInitialValue } from '../register';
import { buildRequiredFields, evaluateFieldStates } from '../expression-evaluator';
import { validateFormData } from '../validator/validationManager';
import { FieldRenderer, renderField } from './render';
import '../../../components/FormRenderer.css';

const parser = new JsonParser();

/**
 * Main form engine orchestrator.
 *
 * @param {object}   props
 * @param {object|string} props.schema   - JSON Schema (object or raw JSON string).
 * @param {function} props.onSubmit      - Async submit handler: (payload) => Promise<any>
 */
function FormEngine({ schema, onSubmit, initialData = null, globalReadOnly = false, submitLabel = 'Soumettre le document' }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Resolution memoisee du schema JSON
  const resolvedSchema = React.useMemo(() => {
    try {
      return schema ? parser.parse(schema) : null;
    } catch {
      return null;
    }
  }, [schema]);

  const properties = resolvedSchema?.properties || {};

  // --- Initialisation des donnees du formulaire ---
  useEffect(() => {
    if (!resolvedSchema) {
      setFormData({});
      return;
    }
    if (initialData) return;

    const nextData = { num_doc: '' };

    // Bug #2 fix : Séparateur underscore `_` au lieu du point `.`
    // Cohérence avec la génération DDL (nom de colonne SQL) et la validation backend.
    const initData = (props, prefix = '') => {
      Object.keys(props).forEach((fieldName) => {
        const path = prefix ? `${prefix}_${fieldName}` : fieldName;
        const field = props[fieldName];

        if (field.type === 'object' && field.properties) {
          initData(field.properties, path);
        } else {
          nextData[path] = getInitialValue(field);
        }
      });
    };

    initData(properties);
    setFormData(nextData);
    setErrors({});
  }, [resolvedSchema, initialData]);

  // --- Sync des donnees en mode consultation / edition (REVIEW) ---
  useEffect(() => {
    if (initialData) {
      // 1. Construire un mapping "minuscule" -> "camelCase d'origine du schema"
      const pathToSchemaKey = {};
      const buildMap = (props, prefix = '') => {
        Object.keys(props).forEach((fieldName) => {
          const path = prefix ? `${prefix}_${fieldName}` : fieldName;
          pathToSchemaKey[path.toLowerCase()] = path;
          if (props[fieldName].type === 'object' && props[fieldName].properties) {
            buildMap(props[fieldName].properties, path);
          }
        });
      };
      
      if (resolvedSchema && resolvedSchema.properties) {
         buildMap(resolvedSchema.properties);
      }
      
      // 2. Normaliser initialData avec les clés du schéma
      const normalizedData = {};
      Object.keys(initialData).forEach(key => {
         const schemaKey = pathToSchemaKey[key.toLowerCase()] || key;
         normalizedData[schemaKey] = initialData[key];
      });

      setFormData(normalizedData);
      setErrors({});
      setSubmitError('');
    }
  }, [initialData, resolvedSchema]);

  // --- Calcul dynamique de la visibilite et des etats des champs ---
  const fieldStates = resolvedSchema ? evaluateFieldStates(resolvedSchema, formData) : {};

  // --- Auto-remplissage des champs lorsque l'employe est trouve ---
  // Bug #7 fix : Mappe à la fois les champs simples ET les variantes spécifiques du schéma
  const handleEmployeFound = useCallback((emp) => {
    setFormData((prev) => ({
      ...prev,
      // Champs simples génériques
      nom: emp.nom || emp.lastName || prev.nom || '',
      prenom: emp.prenom || emp.firstName || prev.prenom || '',
      email: emp.email || prev.email || '',
      // Variantes spécifiques déclarées dans certains schémas
      nomEmploye: emp.nom || emp.lastName || prev.nomEmploye || '',
      prenomEmploye: emp.prenom || emp.firstName || prev.prenomEmploye || '',
      emailEmploye: emp.email || prev.emailEmploye || '',
    }));
  }, []);

  const handleEmployeCleared = useCallback(() => {
    // Optionnel : Vider ou reinitialiser les champs si le matricule est efface
  }, []);

  // --- Handler generique pour les changements dans les inputs ---
  const handleInputChange = (e) => {
    const target = e.target || e;
    const fieldName = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  // --- Validation du formulaire ---
  const validateForm = () => {
    const requiredFields = buildRequiredFields(resolvedSchema, formData);
    const { errors: nextErrors } = validateFormData(
      resolvedSchema,
      formData,
      requiredFields
    );

    // Ignorer les erreurs des champs masques
    const filteredErrors = {};
    Object.keys(nextErrors).forEach(key => {
      if (!fieldStates[key]?.isHidden) {
        filteredErrors[key] = nextErrors[key];
      }
    });

    setErrors(filteredErrors);
    const isValid = Object.keys(filteredErrors).length === 0;

    if (!isValid) {
      setSubmitError("⚠️ Le formulaire est incomplet ou contient des erreurs. Veuillez vérifier les champs en surbrillance.");
    }

    return isValid;
  };

  // --- Soumission du formulaire ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    try {
      if (!validateForm()) return;

      const payload = { num_doc: formData.num_doc };

      // Bug #2 fix : Séparateur underscore `_` pour cohérence avec initData et les colonnes SQL
      const gatherPayload = (props, prefix = '') => {
        Object.entries(props).forEach(([fieldName, field]) => {
          const path = prefix ? `${prefix}_${fieldName}` : fieldName;

          if (fieldStates[path]?.isHidden) return;

          if (field.type === 'object' && field.properties) {
            gatherPayload(field.properties, path);
          } else {
            const value = formData[path];
            if (value === '' || value === null || value === undefined) return;
            if (field?.type === 'integer') { payload[path] = Number.parseInt(value, 10); return; }
            if (field?.type === 'number') { payload[path] = Number(value); return; }
            if (field?.type === 'boolean') { payload[path] = Boolean(value); return; }
            payload[path] = value;
          }
        });
      };

      gatherPayload(properties);

      setIsSubmitting(true);
      if (typeof onSubmit === 'function') {
        await onSubmit(payload, formData);
      }
    } catch (err) {
      console.error("Erreur bloquante lors de la soumission :", err);
      setSubmitError(
        err.response?.data?.error || err.message || "Une erreur inattendue empêche la soumission du formulaire."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resolvedSchema) {
    return <p>Aucune structure de formulaire disponible.</p>;
  }

  const requiredFields = buildRequiredFields(resolvedSchema, formData);

  return (
    <div className="form-renderer">
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
            onChange={globalReadOnly ? undefined : (e) => handleInputChange(e)}
            readOnly={globalReadOnly}
            className={globalReadOnly ? 'input-readonly' : ''}
          />
        </div>

        {Object.keys(properties).map((fieldName) => {
          const field = properties[fieldName];

          return renderField(fieldName, field, formData[fieldName], formData, handleInputChange, {
            required: requiredFields,
            error: errors[fieldName],
            allErrors: errors,
            fieldStates: fieldStates,
            pathPrefix: '',
            globalReadOnly: globalReadOnly,
            onEmployeFound: handleEmployeFound,
            onEmployeCleared: handleEmployeCleared,
          });
        })}

        {!globalReadOnly && (
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="form-submit-button">
              {isSubmitting ? 'Envoi en cours...' : submitLabel}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default FormEngine;