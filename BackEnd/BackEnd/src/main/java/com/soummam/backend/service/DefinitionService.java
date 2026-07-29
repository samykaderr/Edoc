package com.soummam.backend.service;

import com.soummam.backend.exception.TableNotFoundException;
import com.soummam.backend.repository.DefinitionRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DefinitionService — Version MySQL épurée.
 * Responsabilité : Logique métier, parsing et validation des structures.
 * Elle délègue toutes les exécutions SQL au DefinitionRepository.
 */
@Service
public class DefinitionService {

    private static final String ALLOWED_IDENTIFIER = "[a-zA-Z_][a-zA-Z0-9_]*";

    // On injecte le Repository à la place de JdbcTemplate
    private final DefinitionRepository definitionRepository;

    public DefinitionService(DefinitionRepository definitionRepository) {
        this.definitionRepository = definitionRepository;
    }

    public void createTable(Map<String, Object> payload) {
        String tableName = extractAndValidateIdentifier(payload, "tableName");

        // Délégation au Repository
        definitionRepository.executeCreateTable(tableName);
    }

    @SuppressWarnings("unchecked")
    public void addColumns(Map<String, Object> payload) {
        String tableName = extractAndValidateIdentifier(payload, "tableName");
        List<Map<String, Object>> columns = extractColumns(payload);

        for (Map<String, Object> col : columns) {
            String colName  = extractAndValidateIdentifier(col, "name");

            // Utilisation du Repository pour la vérification
            if (definitionRepository.columnExists(tableName, colName)) {
                continue;
            }

            String colType  = validateSqlType(col.get("type"));
            boolean nullable = col.get("nullable") == null || Boolean.TRUE.equals(col.get("nullable"));
            String nullConstraint = nullable ? " NULL" : " NOT NULL";

            // Délégation au Repository
            definitionRepository.executeAddColumn(tableName, colName, colType, nullConstraint);
        }
    }

    @SuppressWarnings("unchecked")
    public void alterColumns(Map<String, Object> payload) {
        String tableName = extractAndValidateIdentifier(payload, "tableName");
        List<Map<String, Object>> columns = extractColumns(payload);

        // Utilisation du Repository pour la vérification de la table
        if (!definitionRepository.tableExists(tableName)) {
            throw new TableNotFoundException(tableName);
        }

        for (Map<String, Object> col : columns) {
            String colName = extractAndValidateIdentifier(col, "name");
            String colType = validateSqlType(col.get("type"));
            boolean nullable = col.get("nullable") == null || Boolean.TRUE.equals(col.get("nullable"));
            String nullConstraint = nullable ? " NULL" : " NOT NULL";

            // Délégation au Repository
            definitionRepository.executeModifyColumn(tableName, colName, colType, nullConstraint);
        }
    }

    // =========================================================================
    // Synchronisation Automatique (JSON Schema -> MySQL)
    // =========================================================================

    @SuppressWarnings("unchecked")
    public void syncSchema(String tableName, Map<String, Object> schema) {
        // 1. Valider le nom de la table
        String safeTableName = extractAndValidateIdentifier(Map.of("tableName", tableName), "tableName");

        // 2. Créer la table si elle n'existe pas
        if (!definitionRepository.tableExists(safeTableName)) {
            definitionRepository.executeCreateTable(safeTableName);
        }

        // 3. Extraire les propriétés du schéma JSON
        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        if (properties == null || properties.isEmpty()) {
            return; // Rien à synchroniser
        }

        // 4. Aplatir les propriétés et mapper les types JSON vers SQL
        List<Map<String, Object>> columns = new ArrayList<>();
        extractColumnsFromProperties(properties, "", columns);

        if (columns.isEmpty()) {
            return;
        }

        // 5. Utiliser la logique existante pour ajouter les colonnes
        Map<String, Object> addColumnsPayload = new HashMap<>();
        addColumnsPayload.put("tableName", safeTableName);
        addColumnsPayload.put("columns", columns);

        addColumns(addColumnsPayload);
    }

    @SuppressWarnings("unchecked")
    private void extractColumnsFromProperties(Map<String, Object> properties, String prefix, List<Map<String, Object>> columns) {
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            String key = prefix + entry.getKey();
            Map<String, Object> fieldDef = (Map<String, Object>) entry.getValue();
            String type = (String) fieldDef.get("type");

            if ("object".equalsIgnoreCase(type) && fieldDef.containsKey("properties")) {
                // Appel récursif pour les objets imbriqués (ex: periode.dateDebut -> periode_dateDebut)
                extractColumnsFromProperties((Map<String, Object>) fieldDef.get("properties"), key + "_", columns);
            } else {
                // Mapper le type JSON vers le type SQL
                String format = (String) fieldDef.get("format");
                String sqlType = mapJsonTypeToSql(type, format);
                
                Map<String, Object> colMap = new HashMap<>();
                colMap.put("name", key);
                colMap.put("type", sqlType);
                colMap.put("nullable", true); // Par défaut on autorise NULL lors de la synchro dynamique
                columns.add(colMap);
            }
        }
    }

    private String mapJsonTypeToSql(String jsonType, String format) {
        if (jsonType == null) return "VARCHAR(255)";
        
        switch (jsonType.toLowerCase()) {
            case "integer":
                return "INTEGER";
            case "number":
                return "NUMERIC(10,2)";
            case "boolean":
                return "BOOLEAN";
            case "string":
                if ("date".equalsIgnoreCase(format)) {
                    return "DATE";
                } else if ("date-time".equalsIgnoreCase(format)) {
                    return "TIMESTAMP";
                }
                return "VARCHAR(255)";
            case "array":
                return "JSON"; // Les tableaux complexes peuvent être stockés en JSON
            default:
                return "VARCHAR(255)";
        }
    }

    // =========================================================================
    // Lecture de la structure (pour les endpoints GET /definitions)
    // =========================================================================

    /**
     * Retourne la liste de toutes les tables utilisateur de la base.
     */
    public List<Map<String, Object>> getTables() {
        return definitionRepository.listTables();
    }

    /**
     * Retourne la liste des colonnes d'une table donnée.
     * Lève TableNotFoundException si la table n'existe pas.
     */
    public List<Map<String, Object>> getFields(String tableName) {
        String safe = extractAndValidateIdentifier(Map.of("tableName", tableName), "tableName");
        if (!definitionRepository.tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }
        return definitionRepository.listColumns(safe);
    }

    // =========================================================================
    // Les Helpers de validation (Restent dans le Service car c'est de la logique)
    // =========================================================================

    private String extractAndValidateIdentifier(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException("Le champ '" + key + "' est requis.");
        }
        String identifier = value.toString().trim().toLowerCase();
        if (!identifier.matches(ALLOWED_IDENTIFIER)) {
            throw new IllegalArgumentException(
                    "Identifiant SQL invalide '" + identifier + "'. Utilisez uniquement [a-z, 0-9, _]."
            );
        }
        /*
        // 💡 CODE À MODIFIER : Si on cherche le nom de la table et qu'il n'a pas le préfixe, on l'ajoute !
        if ("tableName".equals(key) && !identifier.startsWith("doc_")) {
            return "doc_" + identifier;
        }
        */
        return identifier;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractColumns(Map<String, Object> payload) {
        Object raw = payload.get("columns");
        if (!(raw instanceof List) || ((List<?>) raw).isEmpty()) {
            throw new IllegalArgumentException("Le champ 'columns' doit être une liste non vide.");
        }
        return (List<Map<String, Object>>) raw;
    }

    private String validateSqlType(Object rawType) {
        if (rawType == null) {
            throw new IllegalArgumentException("Le type SQL est requis pour chaque colonne.");
        }
        String type = rawType.toString().trim().toUpperCase();
        if (!type.matches("TEXT|VARCHAR\\(\\d+\\)|INTEGER|BIGINT|BOOLEAN|DATE|TIMESTAMP|JSON|NUMERIC\\(\\d+,\\d+\\)")) {
            throw new IllegalArgumentException("Type SQL non autorisé pour MySQL : " + type);
        }
        return type;
    }
}