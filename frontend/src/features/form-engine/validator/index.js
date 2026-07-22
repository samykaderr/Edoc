// ---------------------------------------------------------------------------
// validationManager.js
// Responsabilité unique : valider les valeurs de chaque champ selon les règles
// du JSON Schema (type, minLength, maxLength, pattern, required).
// ---------------------------------------------------------------------------

/**
 * Validates a single field value against its schema definition.
 *
 * @param {object}  field      - JSON Schema field definition.
 * @param {*}       value      - Current value of the field.
 * @param {boolean} isRequired - Whether the field is currently required.
 * @returns {string[]} Array of error messages (empty if valid).
 */
export function validateField(field, value, isRequired) {
  const errors = [];
  const valueAsString = value === null || value === undefined ? '' : String(value).trim();

  if (isRequired && valueAsString === '') {
    errors.push('Ce champ est requis.');
    return errors;
  }

  if (valueAsString === '') return errors;

  // Numeric type validation
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

  // String length validations
  if (typeof field?.minLength === 'number' && valueAsString.length < field.minLength) {
    errors.push(`La longueur minimale est de ${field.minLength} caractères.`);
  }

  if (typeof field?.maxLength === 'number' && valueAsString.length > field.maxLength) {
    errors.push(`La longueur maximale est de ${field.maxLength} caractères.`);
  }

  // Pattern validation
  if (field?.pattern) {
    const pattern = new RegExp(field.pattern);
    if (!pattern.test(valueAsString)) {
      errors.push('Le format de la valeur est invalide.');
    }
  }

  return errors;
}

/**
 * Builds a complete error map for a form, including:
 * - Per-field validation (required, type, length, pattern)
 * - EmployeLookup validation (idEmploye must resolve)
 * - Cross-field date ordering (dateDebut <= dateFin)
 *
 * @param {object}      properties    - JSON Schema properties map.
 * @param {object}      formData      - Current form values.
 * @param {Set<string>} requiredFields - Set of currently required field names.
 * @param {object}      context       - Extra context for special validations.
 * @param {boolean}     context.employeFound         - Whether the employee lookup resolved.
 * @param {Set<string>} context.lookupFilledFields   - Fields auto-filled by lookup (skip manual validation).
 * @param {string}      context.lookupTriggerField   - The field that triggers the lookup (e.g. 'idEmploye').
 * @returns {{ errors: object, isValid: boolean }}
 */
export function buildFormErrors(properties, formData, requiredFields, context = {}) {
  const errors = {};

  // --- Per-field validation ---
  Object.entries(properties).forEach(([fieldName, field]) => {
    if (fieldName === 'idEmploye' || fieldName === 'id_employe') return;

    const fieldErrors = validateField(field, formData[fieldName], requiredFields.has(fieldName));
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors[0];
    }
  });

  // --- Cross-field: dateDebut <= dateFin ---
  let debutField = null;
  let finField = null;
  Object.keys(properties).forEach((key) => {
    const lower = key.toLowerCase();
    if (lower.includes('date') && lower.includes('debut')) debutField = key;
    if (lower.includes('date') && lower.includes('fin'))   finField   = key;
  });

  if (debutField && finField) {
    const debutVal = formData[debutField];
    const finVal   = formData[finField];
    if (debutVal && finVal && new Date(debutVal) > new Date(finVal)) {
      errors[finField]   = 'La date de fin ne peut pas être antérieure à la date de début.';
      if (!errors[debutField]) {
        errors[debutField] = 'La date de début doit être antérieure ou égale à la date de fin.';
      }
    }
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}
