// src/features/form-engine/validator/validationManager.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export const validateFormData = (schema: any, data: any) => {
  const validate = ajv.compile(schema);
  const isValid = validate(data);
  const errors: string[] = [];

  if (!isValid && validate.errors) {
    validate.errors.forEach(err => {
      const field = err.instancePath.replace('/', '') || err.params.missingProperty;
      errors.push(`Champ [${field}] : ${err.message}`);
    });
  }

  // Règle inter-champs pour les dates
  if (data.dateDebut && data.dateFin && new Date(data.dateDebut) > new Date(data.dateFin)) {
    errors.push("La date de début ne peut pas être après la date de fin.");
  }

  return { isValid: errors.length === 0, errors };
};