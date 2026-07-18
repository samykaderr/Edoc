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
   * Convertit le schéma en payload DDL propre pour le DefinitionService MySQL
   */
  public toMysqlPayload(schema: JsonSchema): MysqlTablePayload {
    // Nettoyage du titre pour générer un nom de table SQL valide
    const tableName = schema.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
      .trim()
      .replace(/\s+/g, "_")            // Remplace les espaces par des underscores
      .replace(/[^a-z0-9_]/g, "");     // Sécurité anti-caractères spéciaux

    // Mapping des propriétés JSON en types de la Whitelist MySQL du Back-end
    const columns: MysqlColumnPayload[] = Object.keys(schema.properties).map(key => {
      const prop = schema.properties[key];
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

      return {
        name: key.trim(),
        type: sqlType,
        nullable: !isRequired
      };
    });

    return {
      tableName,
      columns
    };
  }
}