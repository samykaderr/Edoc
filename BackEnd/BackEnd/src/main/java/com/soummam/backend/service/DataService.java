package com.soummam.backend.service;

import com.soummam.backend.exception.TableNotFoundException;
import com.soummam.backend.repository.DataRepository;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * DataService — Responsabilité : Validation métier, sécurité et orchestration
 * des transactions DML dynamique.
 */
@Service
public class DataService {

    private static final String ALLOWED_IDENTIFIER = "[a-zA-Z_][a-zA-Z0-9_]*";

    private final DataRepository dataRepository;

    public DataService(DataRepository dataRepository) {
        this.dataRepository = dataRepository;
    }

    // =========================================================================
    // Lecture
    // =========================================================================

    public List<Map<String, Object>> findAll(String tableName) {
        String safe = validateIdentifier(tableName);

        if (!dataRepository.tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }

        return dataRepository.findAll(safe);
    }

    /**
     * Récupère une seule ligne d'une table dynamique par son identifiant.
     */
    public Map<String, Object> findById(String tableName, String id) {
        String safe = validateIdentifier(tableName);

        if (!dataRepository.tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }

        List<Map<String, Object>> results = dataRepository.findById(safe, id);

        if (results.isEmpty()) {
            throw new EmptyResultDataAccessException(
                    "Aucun document avec l'id '" + id + "' dans la table '" + safe + "'.", 1);
        }

        return results.get(0);
    }

    // =========================================================================
    // Écriture (Transactionnelle avec Registre Mère t_document)
    // =========================================================================

    @Transactional
    public int insert(String tableName, Map<String, Object> payload) {
        String safe = validateIdentifier(tableName);

        if (!dataRepository.tableExists(safe)) {
            throw new TableNotFoundException(safe);
        }

        if (payload == null || payload.isEmpty()) {
            throw new IllegalArgumentException("Le payload ne peut pas être vide.");
        }

        // Si la table cible n'est ni t_document ni t_employe, on enregistre d'abord dans t_document
        if (!"t_document".equalsIgnoreCase(safe) && !"t_employe".equalsIgnoreCase(safe)) {

            // 1. Garantir que la table cible possède la clé étrangère document_id
            dataRepository.ensureColumnExists(safe, "document_id", "INT");

            // 2. Extraire le statut (par défaut PENDING)
            String statut = payload.getOrDefault("statut", "PENDING").toString();

            // 3. Insertion dans t_document
            long generatedId = dataRepository.insertMasterDocument(safe, statut);

            // 4. Injecter l'id généré de t_document dans le payload de la table fille
            payload.put("document_id", (int) generatedId);
        }

        // 5. Validation de la conformité de chaque nom de colonne dans le payload
        for (String key : payload.keySet()) {
            validateIdentifier(key);
        }

        // 6. Exécution de l'INSERT dynamique via le repository
        return dataRepository.insertDynamic(safe, payload);
    }

    // =========================================================================
    // Helpers privés de validation
    // =========================================================================

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