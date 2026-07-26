// src/features/form-engine/validator/validationManager.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
addFormats(ajv);

// Utilitaire pour reconstituer un objet imbriqué en se basant sur le schéma (séparateur '_')
const unflattenWithSchema = (data: Record<string, any>, schemaProperties: any, prefix = ''): any => {
  const result: any = {};
  if (!schemaProperties) return result;

  for (const [key, field] of Object.entries(schemaProperties)) {
    const fieldDef: any = field;
    const path = prefix ? `${prefix}_${key}` : key;

    if (fieldDef.type === 'object' && fieldDef.properties) {
      const nested = unflattenWithSchema(data, fieldDef.properties, path);
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
    } else {
      if (data[path] !== undefined && data[path] !== '' && data[path] !== null) {
        result[key] = data[path];
      }
    }
  }
  return result;
};

// 3. Traduction des messages d'erreur en Français
const translateError = (err: any): string => {
  switch (err.keyword) {
    case 'required':
      return 'Ce champ est obligatoire.';
    case 'format':
      if (err.params.format === 'email') return 'Adresse email invalide.';
      if (err.params.format === 'date') return 'Format de date invalide.';
      return 'Format invalide.';
    case 'minimum':
      return `La valeur doit être supérieure ou égale à ${err.params.limit}.`;
    case 'maximum':
      return `La valeur doit être inférieure ou égale à ${err.params.limit}.`;
    case 'minLength':
      return `Doit contenir au moins ${err.params.limit} caractères.`;
    case 'maxLength':
      return `Ne doit pas dépasser ${err.params.limit} caractères.`;
    default:
      return err.message || 'Erreur de validation.';
  }
};

const evaluateInterFieldRules = (data: any, errors: Record<string, string>) => {
  // data utilise des '_'
  const dateDebut = data['periode_dateDebut'] !== undefined ? data['periode_dateDebut'] : data['dateDebut'];
  const dateFin = data['periode_dateFin'] !== undefined ? data['periode_dateFin'] : data['dateFin'];
  const dateFinPath = data['periode_dateFin'] !== undefined ? 'periode_dateFin' : 'dateFin';

  if (dateDebut && dateFin && new Date(dateDebut) > new Date(dateFin)) {
    errors[dateFinPath] = "La date de début ne peut pas être après la date de fin.";
  }
};

export const validateFormData = (schema: any, data: any, requiredFields?: Set<string>) => {
  // Prevent Ajv from crashing if the same schema is compiled multiple times
  let validate;
  const schemaId = schema.$id || schema.id;
  
  if (schemaId) {
    validate = ajv.getSchema(schemaId);
    if (!validate) {
      validate = ajv.compile(schema);
    }
  } else {
    // If no ID, we must safely compile or remove it. 
    // To avoid memory leaks with anonymous schemas, it's better to compile it and not worry,
    // but Ajv might still complain if we mutate it. We use compile safely.
    try {
      validate = ajv.compile(schema);
    } catch (e) {
      // Fallback: remove all schemas if there's a conflict and try again
      ajv.removeSchema();
      validate = ajv.compile(schema);
    }
  }
  
  // Reconstituer l'objet imbriqué selon le schéma pour Ajv
  const nestedData = unflattenWithSchema(data, schema.properties);
  const isValid = validate(nestedData);
  
  const errors: Record<string, string> = {};

  if (!isValid && validate.errors) {
    validate.errors.forEach(err => {
      // Construction du chemin avec '_' au lieu de '.'
      let fieldPath = err.instancePath.replace(/^\//, '').replace(/\//g, '_');
      
      if (err.keyword === 'required') {
        const missing = err.params.missingProperty;
        fieldPath = fieldPath ? `${fieldPath}_${missing}` : missing;
      }
      
      if (fieldPath) {
        errors[fieldPath] = translateError(err);
      }
    });
  }

  evaluateInterFieldRules(data, errors);

  return { isValid: Object.keys(errors).length === 0, errors };
};