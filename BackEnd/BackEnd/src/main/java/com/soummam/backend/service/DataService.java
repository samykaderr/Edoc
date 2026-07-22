package com.soummam.backend.service;

import com.soummam.backend.exception.TableNotFoundException;
import com.soummam.backend.repository.DataRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

@Service
public class DataService {

    private static final String ALLOWED_IDENTIFIER = "[a-zA-Z_][a-zA-Z0-9_]*";
    private final DataRepository dataRepository;

    public DataService(DataRepository dataRepository) {
        this.dataRepository = dataRepository;
    }

    public List<Map<String, Object>> findAll(String tableName) {
        String safe = validateIdentifier(tableName);
        if (!dataRepository.tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }
        return dataRepository.findAll(safe);
    }

    /**
     * Insère de manière transactionnelle le document :
     * 1. Dans la table maîtresse (t_document) pour obtenir l'ID global.
     * 2. Dans la table d'extension dynamique (doc_xxx) en y associant cet ID.
     */
    @Transactional
    public int insert(String documentType, Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            throw new IllegalArgumentException("Le payload ne peut pas être vide.");
        }

        // 1. Déterminer le nom exact de la table dynamique (ex: doc_decharge)
        String safeTableName = "doc_" + validateIdentifier(documentType);
        if (!dataRepository.tableExists(safeTableName)) {
            throw new TableNotFoundException(safeTableName);
        }

        // 2. Extraire les métadonnées pour la table maîtresse 't_document'
        Object idEmploye = payload.remove("id_employe");
        if (idEmploye == null) {
            idEmploye = payload.remove("idEmploye"); // Supporte le camelCase provenant du Front
        }
        String statut = (String) payload.remove("statut");

        // 3. Insérer d'abord dans t_document et récupérer l'ID généré
        long generatedId = dataRepository.insertMasterDocument(documentType.toLowerCase(), idEmploye, statut);

        // 4. Construire le INSERT dynamique pour l'extension, en forçant l'ID récupéré
        StringJoiner columns     = new StringJoiner(", ");
        StringJoiner placeholders = new StringJoiner(", ");

        // On réserve la première case du tableau de valeurs pour notre ID maître
        Object[] values = new Object[payload.size() + 1];

        columns.add("id");
        placeholders.add("?");
        values[0] = generatedId;

        int i = 1;
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            columns.add(validateIdentifier(entry.getKey()));
            placeholders.add("?");
            values[i++] = entry.getValue();
        }

        String sql = String.format(
                "INSERT INTO %s (%s) VALUES (%s)",
                safeTableName, columns, placeholders
        );

        // 5. Exécuter l'insertion finale dans la table d'extension
        return dataRepository.executeInsert(sql, values);
    }

    private String validateIdentifier(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("L'identifiant SQL ne peut pas être vide.");
        }
        String identifier = raw.trim().toLowerCase();
        if (!identifier.matches(ALLOWED_IDENTIFIER)) {
            throw new IllegalArgumentException("Identifiant SQL invalide : '" + identifier + "'.");
        }
        return identifier;
    }
}