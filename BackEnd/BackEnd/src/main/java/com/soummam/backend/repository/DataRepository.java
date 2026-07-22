package com.soummam.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Repository
public class DataRepository {

    private final JdbcTemplate jdbc;

    public DataRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Insère les métadonnées globales dans la table maîtresse t_document
     * et retourne l'ID généré par MySQL.
     */
    public long insertMasterDocument(String typeDocument, Object idEmploye, String statut) {
        String sql = "INSERT INTO t_document (type_document, id_employe, statut, date_creation) VALUES (?, ?, ?, NOW())";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, typeDocument);

            if (idEmploye != null) {
                ps.setObject(2, idEmploye);
            } else {
                ps.setNull(2, java.sql.Types.INTEGER);
            }

            ps.setString(3, statut != null ? statut : "PENDING");
            return ps;
        }, keyHolder);

        if (keyHolder.getKey() == null) {
            throw new RuntimeException("Échec de la récupération de l'ID généré pour t_document.");
        }

        return keyHolder.getKey().longValue();
    }

    public boolean tableExists(String tableName) {
        String sql = "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = DATABASE() AND table_name = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, tableName);
        return count != null && count > 0;
    }

    public List<Map<String, Object>> findAll(String safeTableName) {
        return jdbc.queryForList("SELECT * FROM " + safeTableName);
    }

    public int executeInsert(String sql, Object[] values) {
        return jdbc.update(sql, values);
    }
}