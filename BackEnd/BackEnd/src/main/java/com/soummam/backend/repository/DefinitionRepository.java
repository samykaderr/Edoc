package com.soummam.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * DefinitionRepository — Responsabilité unique : Accès physique à la BDD (MySQL).
 * C'est la seule classe de la couche DDL autorisée à manipuler JdbcTemplate.
 */
@Repository
public class DefinitionRepository {

    private final JdbcTemplate jdbc;

    public DefinitionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Exécute la création de la table avec un UUID MySQL.
     */
    public void executeCreateTable(String tableName) {
        String sql = String.format(
                "CREATE TABLE IF NOT EXISTS %s (id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()))",
                tableName
        );
        jdbc.execute(sql);
    }

    /**
     * Interroge le dictionnaire MySQL pour savoir si la table existe.
     */
    public boolean tableExists(String tableName) {
        String sql = "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = DATABASE() AND table_name = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, tableName);
        return count != null && count > 0;
    }

    /**
     * Interroge le dictionnaire MySQL pour savoir si une colonne existe déjà.
     */
    public boolean columnExists(String tableName, String columnName) {
        String sql = "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, tableName, columnName);
        return count != null && count > 0;
    }

    /**
     * Injecte une nouvelle colonne via ALTER TABLE.
     */
    public void executeAddColumn(String tableName, String colName, String colType, String nullConstraint) {
        String sql = String.format(
                "ALTER TABLE %s ADD COLUMN %s %s%s",
                tableName, colName, colType, nullConstraint
        );
        jdbc.execute(sql);
    }

    /**
     * Modifie une colonne existante via MODIFY COLUMN.
     */
    public void executeModifyColumn(String tableName, String colName, String colType, String nullConstraint) {
        String sql = String.format(
                "ALTER TABLE %s MODIFY COLUMN %s %s%s",
                tableName, colName, colType, nullConstraint
        );
        jdbc.execute(sql);
    }
}