package com.soummam.backend.service;

import com.soummam.backend.exception.TableNotFoundException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

/**
 * DataService — Responsabilité : DML dynamique (INSERT / SELECT)
 * avec gestion de la table mère t_document.
 */
@Service
public class DataService {

    private static final String ALLOWED_IDENTIFIER = "[a-zA-Z_][a-zA-Z0-9_]*";

    private final JdbcTemplate jdbc;

    public DataService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // =========================================================================
    // Lecture
    // =========================================================================

    public List<Map<String, Object>> findAll(String tableName) {
        String safe = validateIdentifier(tableName);

        if (!tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }

        return jdbc.queryForList("SELECT * FROM " + safe);
    }

    /**
     * Récupère une seule ligne d'une table dynamique par son identifiant.
     *
     * @param tableName nom de la table (validé contre l'injection SQL)
     * @param id        valeur de la colonne {@code id}
     * @return la ligne sous forme de Map ou lance {@link EmptyResultDataAccessException} si introuvable
     */
    public Map<String, Object> findById(String tableName, String id) {
        String safe = validateIdentifier(tableName);

        if (!tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }

        String sql = "SELECT * FROM " + safe + " WHERE id = ?";
        List<Map<String, Object>> results = jdbc.queryForList(sql, id);

        if (results.isEmpty()) {
            throw new EmptyResultDataAccessException(
                    "Aucun document avec l'id '" + id + "' dans la table '" + safe + "'.", 1);
        }

        return results.get(0);
    }

    // =========================================================================
    // Écriture (Transactionnelle avec Table Mère t_document)
    // =========================================================================

    @Transactional
    public int insert(String tableName, Map<String, Object> payload) {
        String safe = validateIdentifier(tableName);

        if (!tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }

        if (payload == null || payload.isEmpty()) {
            throw new IllegalArgumentException("Le payload ne peut pas être vide.");
        }

        // Si la table cible n'est ni t_document ni t_employe, on enregistre d'abord dans t_document
        if (!"t_document".equalsIgnoreCase(safe) && !"t_employe".equalsIgnoreCase(safe)) {

            // 1. Garantir que la table fille possède la colonne document_id
            ensureColumnExists(safe, "document_id", "INT");

            // 2. Extraire l'id_employe s'il est présent dans le payload (ex: idemploye ou id_employe)
            Object idEmployeObj = payload.get("idemploye");
            if (idEmployeObj == null) {
                idEmployeObj = payload.get("id_employe");
            }

            Integer idEmploye = null;
            if (idEmployeObj != null) {
                try {
                    idEmploye = Integer.parseInt(idEmployeObj.toString());
                } catch (NumberFormatException ignored) {}
            }

            String statut = payload.getOrDefault("statut", "PENDING").toString();

            // 3. Insertion dans t_document
            String sqlDoc = "INSERT INTO `t_document` (`type_document`, `id_employe`, `statut`) VALUES (?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();

            final Integer finalIdEmploye = idEmploye;
            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sqlDoc, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, safe);
                if (finalIdEmploye != null) {
                    ps.setInt(2, finalIdEmploye);
                } else {
                    ps.setNull(2, java.sql.Types.INTEGER);
                }
                ps.setString(3, statut);
                return ps;
            }, keyHolder);

            // 4. Injecter l'id généré de t_document dans le payload de la table fille
            Number generatedId = keyHolder.getKey();
            if (generatedId != null) {
                payload.put("document_id", generatedId.intValue());
            }
        }

        // 5. Construction et exécution de l'INSERT dynamique habituel dans la table fille
        StringJoiner columns     = new StringJoiner(", ");
        StringJoiner placeholders = new StringJoiner(", ");
        Object[]     values      = new Object[payload.size()];

        int i = 0;
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            columns.add("`" + validateIdentifier(entry.getKey()) + "`");
            placeholders.add("?");
            values[i++] = entry.getValue();
        }

        String sql = String.format(
                "INSERT INTO `%s` (%s) VALUES (%s)",
                safe, columns, placeholders
        );

        return jdbc.update(sql, values);
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    private boolean tableExists(String tableName) {
        String sql = "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = DATABASE() AND table_name = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, tableName);
        return count != null && count > 0;
    }

    /**
     * Ajoute une colonne à la table si elle n'existe pas encore.
     */
    private void ensureColumnExists(String tableName, String columnName, String columnType) {
        String checkSql = "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?";
        Integer count = jdbc.queryForObject(checkSql, Integer.class, tableName, columnName);
        if (count == null || count == 0) {
            String alterSql = String.format("ALTER TABLE `%s` ADD COLUMN `%s` %s NULL", tableName, columnName, columnType);
            jdbc.execute(alterSql);
        }
    }

    private String validateIdentifier(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("L'identifiant SQL ne peut pas être vide.");
        }
        String identifier = raw.trim().toLowerCase();
        if (!identifier.matches(ALLOWED_IDENTIFIER)) {
            throw new IllegalArgumentException(
                    "Identifiant SQL invalide : '" + identifier + "'."
            );
        }
        return identifier;
    }
}