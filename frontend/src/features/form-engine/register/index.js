// ---------------------------------------------------------------------------
// fieldRegistry.js
// Responsabilité unique : mapper un type de champ JSON Schema → contrôle HTML.
// Principe O (Open/Closed) : extensible en ajoutant des règles sans modifier
// le code existant.
// ---------------------------------------------------------------------------

/**
 * Ordered list of rules. Each rule maps a field definition to a control type.
 * To add a new field type, push a new rule — no existing code needs to change.
 *
 * @type {Array<{ test: (field: object, name: string) => boolean, control: string }>}
 */
const FIELD_RULES = [
  { test: (f)      => !!f.enum || !!f.oneOf,                                        control: 'select'   },
  { test: (f)      => f.format === 'date',                                        control: 'date'     },
  { test: (_, n)   => n.toLowerCase().includes('date'),                           control: 'date'     },
  { test: (f)      => f.type === 'boolean',                                        control: 'checkbox' },
  { test: (f)      => f.type === 'integer' || f.type === 'number',                control: 'number'   },
  { test: (f)      => f.type === 'string' && typeof f.maxLength === 'number' && f.maxLength > 120,
                                                                                   control: 'textarea' },
];

/**
 * Returns the appropriate HTML control type for a given field definition.
 *
 * @param {object} field       - JSON Schema field definition.
 * @param {string} [fieldName] - The property key, used for name-based heuristics.
 * @returns {string} - One of: 'select' | 'date' | 'checkbox' | 'number' | 'textarea' | 'text'
 */
export function getFieldControl(field, fieldName = '') {
  if (!field) return 'unsupported';
  const rule = FIELD_RULES.find(({ test }) => test(field, fieldName));
  if (rule) return rule.control;
  
  if (field.type === 'string' || !field.type) return 'text';
  return 'unsupported';
}

/**
 * Returns the initial (empty) value for a field, respecting its `default` property
 * and its type.
 *
 * @param {object} field - JSON Schema field definition.
 * @returns {string|boolean}
 */
export function getInitialValue(field) {
  if (field?.default !== undefined) return field.default;
  if (field?.type === 'boolean') return false;
  return '';
}
