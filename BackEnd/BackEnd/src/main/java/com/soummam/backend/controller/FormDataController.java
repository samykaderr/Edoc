package com.soummam.backend.controller;

import com.soummam.backend.service.DataService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FormDataController — Responsabilité unique : DML (manipulation des données).
 *
 * Ce contrôleur est désormais aligné à 100% sur les URLs du schéma officiel,
 * est ouvert aux requêtes Cross-Origin, et délègue tout au DataService.
 */
@RestController
@RequestMapping("/api/v1") // 🔄 Changé pour correspondre exactement au schéma (/api/v1/all et /api/v1/insert)
@CrossOrigin(origins = "*")   // 🌐 Ajouté pour permettre la communication avec le Front-end React
public class FormDataController {

    private final DataService dataService;

    public FormDataController(DataService dataService) {
        this.dataService = dataService;
    }

    // =========================================================================
    // GET /api/v1/all?table=nom_table
    // =========================================================================
    /**
     * Retourne toutes les lignes d'une table sous forme de liste JSON.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> getAll(
            @RequestParam(name = "table") String table) {

        List<Map<String, Object>> rows = dataService.findAll(table);
        return ResponseEntity.ok(rows);
    }

    // =========================================================================
    // POST /api/v1/insert
    // =========================================================================
    /**
     * Insère un enregistrement dans la table cible à partir d'un payload JSON brut validé par le Front.
     */
    @PostMapping("/insert")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> insert(@RequestBody Map<String, Object> body) {
        // Extraction sécurisée des deux clés requises
        Object tableRaw   = body.get("table");
        Object payloadRaw = body.get("payload");

        if (tableRaw == null || tableRaw.toString().isBlank()) {
            throw new IllegalArgumentException("Le champ 'table' est requis dans le body.");
        }
        if (!(payloadRaw instanceof Map)) {
            throw new IllegalArgumentException("Le champ 'payload' doit être un objet JSON.");
        }

        String tableName            = tableRaw.toString().trim();
        Map<String, Object> payload = (Map<String, Object>) payloadRaw;

        int inserted = dataService.insert(tableName, payload);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of(
                        "message",       "Enregistrement inséré avec succès.",
                        "table",         tableName,
                        "rowsInserted",  inserted
                ));
    }
}