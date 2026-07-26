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
     * Exécute la création de la table avec les colonnes système obligatoires :
     * - id         : clé primaire UUID auto-générée
     * - num_doc    : numéro de document (envoyé par le Frontend)
     * - statut     : état du document (défaut : 'brouillon')
     * - created_at : horodatage automatique de création
     */
    public void executeCreateTable(String tableName) {
        String sql = String.format(
                "CREATE TABLE IF NOT EXISTS %s (id INT PRIMARY KEY)",
                tableName
        );
        jdbc.execute(sql);
    }

    /**
     * Retourne la liste de toutes les tables utilisateur de la base courante.
     * Exclut les tables système d'information_schema.
     */
    public java.util.List<java.util.Map<String, Object>> listTables() {
        String sql = "SELECT table_name AS tableName, table_rows AS rowCount, " +
                     "create_time AS createdAt " +
                     "FROM information_schema.tables " +
                     "WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' " +
                     "ORDER BY table_name";
        return jdbc.queryForList(sql);
    }

    /**
     * Retourne la liste des colonnes d'une table (nom, type, nullable).
     */
    public java.util.List<java.util.Map<String, Object>> listColumns(String tableName) {
        String sql = "SELECT column_name AS name, data_type AS type, " +
                     "is_nullable AS nullable, column_default AS defaultValue " +
                     "FROM information_schema.columns " +
                     "WHERE table_schema = DATABASE() AND table_name = ? " +
                     "ORDER BY ordinal_position";
        return jdbc.queryForList(sql, tableName);
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