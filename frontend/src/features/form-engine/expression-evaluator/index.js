
/**
 * Vérifie si la structure du schéma JSON est valide et exploitable.
 *
 * @param {object} schema - L'objet schéma à évaluer.
 * @returns {boolean} True si le schéma est valide et contient au moins un champ, false sinon.
 */

/**
 * Étape 0 : Validation Générique de l'En-tête et du Schéma Minimal
 * Vérifie que le schéma JSON possède toutes ses métadonnées obligatoires
 * et une structure valide, même si le formulaire ne contient aucun champ.
 * 
 * @param {object} schema - Le schéma JSON à valider.
 * @returns {boolean} - True si le schéma respecte la structure minimale, False sinon.
 */
export function isValidSchemaStructure(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }

  // 1. Validation de l'en-tête (Métadonnées obligatoires)
  const hasValidSchema      = typeof schema.$schema === 'string' && schema.$schema.trim() !== '';
  const hasValidId          = typeof schema.$id === 'string' && schema.$id.trim() !== '';
  const hasValidTitle       = typeof schema.title === 'string' && schema.title.trim() !== '';
  const hasValidDescription = typeof schema.description === 'string' && schema.description.trim() !== '';
  const isObjectType        = schema.type === 'object';
  const hasDocumentType     = typeof schema.documentType === 'string' && schema.documentType.trim() !== '';

  if (!hasValidSchema || !hasValidId || !hasValidTitle || !hasValidDescription || !isObjectType || !hasDocumentType) {
    return false;
  }

  // 2. Validation minimale de "properties" (doit juste être un objet)
  if (!schema.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
    return false;
  }

  return true;
}
/**
 * Builds the set of required field names by evaluating static `required` and
 * conditional `allOf / if / then` rules against the current form values.
 *
 * @param {object} schema  // Parsed JSON Schema object.
 * @param {object} values  // Current form values keyed by field name.
 * @returns {Set<string>}  // Set of field names that are currently required.
 */
export function buildRequiredFields(schema, values) {
  // Étape 0 / Garde-fou : Validation stricte de la structure du schéma
  if (!isValidSchemaStructure(schema)) {
    throw new Error("Erreur fatale : Le schéma fourni est vide ou sa structure est invalide. Impossible d'évaluer les conditions du formulaire.");
  }

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
