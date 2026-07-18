package com.soummam.backend.service;

import com.soummam.backend.exception.TableNotFoundException;
import com.soummam.backend.repository.DefinitionRepository;
import org.springframework.stereotype.Service;

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