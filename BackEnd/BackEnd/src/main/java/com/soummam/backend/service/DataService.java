package com.soummam.backend.service;

import com.soummam.backend.exception.TableNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

/**
 * DataService — Responsabilité unique : DML dynamique (INSERT / SELECT).
 *
 * Ce service ignore totalement la structure des formulaires. Il reçoit du JSON brut
 * (sous forme de Map Java) et construit dynamiquement les requêtes SQL paramétrées.
 * Aucune entité rigide (Conge, Document, etc.) n'est référencée ici.
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

    /**
     * Retourne toutes les lignes d'une table sous forme de liste de Map.
     * Chaque Map représente une ligne : { "colonne": valeur, ... }
     *
     * @param tableName Nom de la table cible (validé avant exécution)
     * @return Liste de Map<String, Object> — désérialisable directement en JSON
     */
    public List<Map<String, Object>> findAll(String tableName) {
        String safe = validateIdentifier(tableName);

        if (!tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }

        return jdbc.queryForList("SELECT * FROM " + safe);
    }

    // =========================================================================
    // Écriture
    // =========================================================================

    /**
     * Insère dynamiquement un enregistrement dans la table cible.
     * Construit le INSERT en utilisant uniquement les clés/valeurs du payload.
     *
     * @param tableName Nom de la table cible
     * @param payload   Map des données du formulaire { "champ1": val1, "champ2": val2, ... }
     * @return Nombre de lignes insérées (toujours 1 en cas de succès)
     */
    public int insert(String tableName, Map<String, Object> payload) {
        String safe = validateIdentifier(tableName);

        if (!tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }

        if (payload == null || payload.isEmpty()) {
            throw new IllegalArgumentException("Le payload ne peut pas être vide.");
        }

        // Construction sécurisée du INSERT avec colonnes et placeholders dynamiques
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
     * Valide et normalise un identifiant SQL (nom de table ou de colonne).
     * Protège contre l'injection SQL sur les noms non paramétrables.
     */
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
