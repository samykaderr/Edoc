// src/features/form-engine/parser/parser.ts

// Types de description du Schéma JSON (Draft 2020-12)
export interface SchemaProperties {
  [key: string]: {
    type: string;
    title?: string;
    format?: string;
    maxLength?: number;
    conditions?: string;
    oneOf?: Array<{ const: string; title: string }>;
  };
}

export interface JsonSchema {
  title: string;
  type: string;
  properties: SchemaProperties;
  required?: string[];
}

// Types des Payloads DDL destinés au Back-end MySQL
export interface MysqlColumnPayload {
  name: string;
  type: string;
  nullable: boolean;
}

export interface MysqlTablePayload {
  tableName: string;
  columns: MysqlColumnPayload[];
}

/**
 * Interface Parser — Le contrat d'architecture (Comme en Java).
 */
export interface Parser {
  parse(rawSchema: string | object): JsonSchema;
  toMysqlPayload(schema: JsonSchema): MysqlTablePayload;
}