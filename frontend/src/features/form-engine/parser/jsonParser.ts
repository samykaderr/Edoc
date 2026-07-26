// src/features/form-engine/parser/jsonParser.ts

import { Parser, JsonSchema, MysqlTablePayload, MysqlColumnPayload } from './parser';

/**
 * JsonParser — Implémentation concrète du contrat Parser.
 * (Équivalent à un "public class JsonParser implements Parser" en Java)
 */
export class JsonParser implements Parser {

  /**
   * Analyse et valide la structure globale du schéma JSON
   */
  public parse(rawSchema: string | object): JsonSchema {
    const schema = typeof rawSchema === 'string' ? JSON.parse(rawSchema) : rawSchema;

    if (!schema.properties || typeof schema.properties !== 'object') {
      throw new Error("Structure de schéma invalide : 'properties' est manquant.");
    }
    return schema as JsonSchema;
  }

  /**
   * Convertit le schéma en payload DDL propre pour le DefinitionService MySQL.
   *
   * Bug #1 fix : Les colonnes système (id, num_doc, statut, created_at) ne sont pas
   * incluses dans le payload utilisateur — elles sont injectées directement par le
   * backend dans le CREATE TABLE. On s'assure de ne pas les dupliquer.
   *
   * Bug #2 fix : Pour les champs imbriqués (type object), on génère des noms de colonnes
   * avec underscore `_` (ex: periode_dateDebut) au lieu du point `.` qui est illégal en SQL
   * et rejeté par la validation backend (DataService.validateIdentifier).
   *
   * Bug #5 fix : Le tableName est normalisé en snake_case pur pour être utilisé de façon
   * cohérente comme clé d'accès (lecture ET écriture) sans recalcul divergent.
   */
  public toMysqlPayload(schema: JsonSchema): MysqlTablePayload {
    // Nettoyage du titre pour générer un nom de table SQL valide (snake_case)
    const tableName = schema.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
      .trim()
      .replace(/\s+/g, "_")            // Remplace les espaces par des underscores
      .replace(/[^a-z0-9_]/g, "");     // Sécurité anti-caractères spéciaux

    // Colonnes systèmes réservées : injectées par le backend via CREATE TABLE.
    // Ne pas les inclure dans le payload pour éviter les doublons DDL.
    const SYSTEM_COLUMNS = new Set(['id', 'num_doc', 'statut', 'created_at']);

    // Flatten récursif des propriétés imbriquées avec underscore `_` (Bug #2)
    const flattenColumns = (
      props: Record<string, any>,
      prefix: string = ''
    ): MysqlColumnPayload[] => {
      const cols: MysqlColumnPayload[] = [];

      Object.keys(props).forEach(key => {
        const columnName = prefix ? `${prefix}_${key}` : key;

        // Ignorer les colonnes système pour éviter les conflits DDL
        if (SYSTEM_COLUMNS.has(columnName)) return;

        const prop = props[key];

        // Récursion sur les objets imbriqués
        if (prop.type === 'object' && prop.properties) {
          cols.push(...flattenColumns(prop.properties, columnName));
          return;
        }

        let sqlType = 'TEXT'; // Type par défaut

        if (prop.format === 'date' || key.toLowerCase().includes('date')) {
          sqlType = 'DATE';
        } else if (prop.format === 'email') {
          sqlType = 'VARCHAR(255)';
        } else if (prop.type === 'integer') {
          sqlType = 'INTEGER';
        } else if (prop.type === 'number') {
          sqlType = 'NUMERIC(10,2)';
        } else if (prop.type === 'boolean') {
          sqlType = 'BOOLEAN';
        } else if (prop.type === 'string') {
          sqlType = prop.maxLength ? `VARCHAR(${prop.maxLength})` : 'TEXT';
        } else if (prop.oneOf) {
          sqlType = 'VARCHAR(50)'; // Clé technique des listes déroulantes
        }

        const isRequired = schema.required?.includes(key) || false;

        cols.push({
          name: columnName,
          type: sqlType,
          nullable: !isRequired,
        });
      });

      return cols;
    };

    const columns = flattenColumns(schema.properties);

    return {
      tableName,
      columns,
    };
  }
}