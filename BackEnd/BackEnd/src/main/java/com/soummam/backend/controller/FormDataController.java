package com.soummam.backend.controller;

import com.soummam.backend.service.DataService;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FormDataController — Endpoints DML (INSERT / SELECT) alignés sur la convention Frontend.
 *
 * Convention : le nom de table est un path-variable dans l'URL (snake_case slugifié).
 * Le payload est envoyé directement dans le body (sans wrapper { "table":..., "payload":... }).
 *
 * GET  /api/v1/form-data/{tableName}      → retourne toutes les lignes
 * GET  /api/v1/form-data/{tableName}/{id} → retourne une seule ligne par ID
 * POST /api/v1/form-data/{tableName}      → insère un enregistrement
 */
@RestController
@RequestMapping("/api/v1/form-data")
@CrossOrigin(origins = "*")
public class FormDataController {

    private final DataService dataService;

    public FormDataController(DataService dataService) {
        this.dataService = dataService;
    }

    /**
     * GET /api/v1/form-data/{tableName}
     * Récupère toutes les lignes enregistrées pour une table de document donnée.
     */
    @GetMapping("/{tableName}")
    public ResponseEntity<List<Map<String, Object>>> getAllData(@PathVariable String tableName) {
        List<Map<String, Object>> records = dataService.findAll(tableName);
        return ResponseEntity.ok(records);
    }

    /**
     * GET /api/v1/form-data/{tableName}/{id}
     * Récupère un seul enregistrement par son identifiant.
     * Retourne 200 avec la ligne, ou 404 si introuvable.
     */
    @GetMapping("/{tableName}/{id}")
    public ResponseEntity<Map<String, Object>> getById(
            @PathVariable String tableName,
            @PathVariable String id) {
        try {
            Map<String, Object> record = dataService.findById(tableName, id);
            return ResponseEntity.ok(record);
        } catch (EmptyResultDataAccessException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "status", "NOT_FOUND",
                            "error", "Document introuvable.",
                            "details", e.getMessage() != null ? e.getMessage() : ""
                    ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "status", "ERROR",
                            "error", "Erreur lors de la récupération du document.",
                            "details", e.getMessage() != null ? e.getMessage() : "Unknown error"
                    ));
        }
    }

    /**
     * POST /api/v1/form-data/{tableName}
     * Insère un nouvel enregistrement dans la table du document.
     */
    @PostMapping("/{tableName}")
    public ResponseEntity<Map<String, Object>> insertData(
            @PathVariable String tableName,
            @RequestBody Map<String, Object> payload) {

        try {
            dataService.insert(tableName, payload);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "status", "SUCCESS",
                            "message", "Données enregistrées avec succès dans la table : " + tableName
                    ));
        } catch (org.springframework.dao.DataAccessException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "status", "ERROR",
                            "error", "Erreur SQL lors de l'insertion. Vérifiez que la structure du JSON correspond aux colonnes.",
                            "details", e.getMessage() != null ? e.getMessage() : "Unknown DB error"
                    ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "status", "ERROR",
                            "error", "Erreur interne lors de la sauvegarde.",
                            "details", e.getMessage() != null ? e.getMessage() : "Unknown error"
                    ));
        }
    }
}