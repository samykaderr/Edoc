package com.soummam.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

/**
 * DataRepository — Responsabilité : Exécution bas niveau des requêtes SQL (JDBC)
 */
@Repository
public class DataRepository {

    private final JdbcTemplate jdbc;

    public DataRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Vérifie si une table existe dans la base de données actuelle.
     */
    public boolean tableExists(String tableName) {
        String sql = "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = DATABASE() AND table_name = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, tableName);
        return count != null && count > 0;
    }

    /**
     * Ajoute la colonne spécifiée à la table si elle n'existe pas encore.
     */
    public void ensureColumnExists(String tableName, String columnName, String columnType) {
        String checkSql = "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?";
        Integer count = jdbc.queryForObject(checkSql, Integer.class, tableName, columnName);
        if (count == null || count == 0) {
            String alterSql = String.format("ALTER TABLE `%s` ADD COLUMN `%s` %s NULL", tableName, columnName, columnType);
            jdbc.execute(alterSql);
        }
    }

    /**
     * Récupère toutes les lignes d'une table.
     */
    public List<Map<String, Object>> findAll(String safeTableName) {
        return jdbc.queryForList("SELECT * FROM `" + safeTableName + "`");
    }

    /**
     * Récupère les lignes correspondant à un identifiant dans une table.
     */
    public List<Map<String, Object>> findById(String safeTableName, String id) {
        String sql = "SELECT * FROM `" + safeTableName + "` WHERE id = ?";
        return jdbc.queryForList(sql, id);
    }

    /**
     * Insère un enregistrement générique dans la table mère t_document
     * et retourne la clé primaire générée.
     */
    public long insertMasterDocument(String typeDocument, String statut) {
        String sql = "INSERT INTO `t_document` (`type_document`, `statut`) VALUES (?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, typeDocument);
            ps.setString(2, statut != null ? statut : "PENDING");
            return ps;
        }, keyHolder);

        if (keyHolder.getKey() == null) {
            throw new RuntimeException("Échec de la récupération de l'ID généré pour t_document.");
        }

        return keyHolder.getKey().longValue();
    }

    /**
     * Effectue l'INSERT dynamique dans n'importe quelle table dynamique.
     */
    public int insertDynamic(String safeTableName, Map<String, Object> payload) {
        StringJoiner columns     = new StringJoiner(", ");
        StringJoiner placeholders = new StringJoiner(", ");
        Object[]     values      = new Object[payload.size()];

        int i = 0;
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            columns.add("`" + entry.getKey() + "`");
            placeholders.add("?");
            values[i++] = entry.getValue();
        }

        String sql = String.format(
                "INSERT INTO `%s` (%s) VALUES (%s)",
                safeTableName, columns, placeholders
        );

        return jdbc.update(sql, values);
    }
}