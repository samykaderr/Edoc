/**
 * Vérifie si la structure du schéma JSON est valide et exploitable.
 *
 * @param {object} schema - L'objet schéma à évaluer.
 * @returns {boolean} True si le schéma est valide et contient au moins un champ, false sinon.
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
 * Builds the set of required field names (using flat paths).
 */
export function buildRequiredFields(schema, values) {
  if (!isValidSchemaStructure(schema)) {
    throw new Error("Erreur fatale : Le schéma fourni est vide ou sa structure est invalide.");
  }

  const requiredFields = new Set();

  const traverse = (props, requiredArr, prefix = '') => {
    if (Array.isArray(requiredArr)) {
      requiredArr.forEach(req => requiredFields.add(prefix ? `${prefix}_${req}` : req));
    }
    if (props) {
      Object.entries(props).forEach(([key, field]) => {
        if (field.type === 'object' && field.properties) {
          const path = prefix ? `${prefix}_${key}` : key;
          traverse(field.properties, field.required, path);
        }
      });
    }
  };

  traverse(schema.properties, schema.required);

  if (Array.isArray(schema.allOf)) {
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
  }

  return requiredFields;
}

/**
 * Evaluates field states (isHidden, isReadOnly) statically and dynamically.
 */
export function evaluateFieldStates(schema, formData) {
  const states = {};

  const traverse = (props, prefix = '') => {
    if (!props) return;
    Object.entries(props).forEach(([key, field]) => {
      const path = prefix ? `${prefix}_${key}` : key;
      
      states[path] = {
        isHidden: !!field.hidden,
        isReadOnly: !!field.readOnly || !!field.disabled
      };

      if (field.type === 'object' && field.properties) {
        traverse(field.properties, path);
      }
    });
  };
  
  if (schema.properties) traverse(schema.properties);

  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach(rule => {
      const conditionProps = rule?.if?.properties || {};
      const conditionEntries = Object.entries(conditionProps);
      
      if (conditionEntries.length === 0) return;

      const isMatch = conditionEntries.every(([fieldName, condition]) => {
        return formData[fieldName] === condition?.const;
      });

      if (isMatch && rule?.then?.properties) {
        const applyThenStates = (props, prefix = '') => {
          Object.entries(props).forEach(([key, field]) => {
            const path = prefix ? `${prefix}_${key}` : key;
            if (!states[path]) states[path] = { isHidden: false, isReadOnly: false };
            
            if (field.hidden !== undefined) states[path].isHidden = field.hidden;
            if (field.readOnly !== undefined) states[path].isReadOnly = field.readOnly;
            if (field.disabled !== undefined) states[path].isReadOnly = field.disabled;

            if (field.properties) {
              applyThenStates(field.properties, path);
            }
          });
        };
        applyThenStates(rule.then.properties);
      }
    });
  }

  return states;
}
