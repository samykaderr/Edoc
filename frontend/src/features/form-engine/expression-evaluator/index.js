// ---------------------------------------------------------------------------
// conditionEvaluator.js
// Responsabilité unique : évaluer les conditions allOf/if/then d'un JSON Schema
// et retourner l'ensemble des champs requis compte tenu des valeurs actuelles.
// ---------------------------------------------------------------------------

/**
 * Builds the set of required field names by evaluating static `required` and
 * conditional `allOf / if / then` rules against the current form values.
 *
 * @param {object} schema  - Parsed JSON Schema object.
 * @param {object} values  - Current form values keyed by field name.
 * @returns {Set<string>}  - Set of field names that are currently required.
 */
export function buildRequiredFields(schema, values) {
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
