package com.soummam.backend.controller;

import com.soummam.backend.exception.TableNotFoundException;
import com.soummam.backend.service.DefinitionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FormDefinitionController — Endpoints DDL alignés sur la convention Frontend.

 * Endpoints de lecture (structure) :
 *   GET  /api/v1/definitions/table              → liste toutes les tables
 *   GET  /api/v1/definitions/fields?tableName=  → liste les colonnes d'une table

 * Endpoints d'écriture (création de schéma) :
 *   POST /api/v1/definitions/table              → crée une table
 *   POST /api/v1/definitions/fields             → ajoute des colonnes à une table
 *   PUT  /api/v1/definitions/fields             → modifie des colonnes existantes
 */
@RestController
@RequestMapping("/api/v1/definitions")
@CrossOrigin(origins = "*")
public class FormDefinitionController {

    private final DefinitionService definitionService;

    public FormDefinitionController(DefinitionService definitionService) {
        this.definitionService = definitionService;
    }

    // =========================================================================
    // GET /api/v1/definitions/table
    // Retourne la liste de toutes les tables de la base de données.
    // =========================================================================
    @GetMapping("/table")
    public ResponseEntity<List<Map<String, Object>>> getTables() {
        List<Map<String, Object>> tables = definitionService.getTables();
        return ResponseEntity.ok(tables);
    }

    // =========================================================================
    // POST /api/v1/definitions/table
    // Crée une nouvelle table avec les colonnes système obligatoires.
    // Payload attendu : { "tableName": "doc_demande_conge" }
    // =========================================================================
    @PostMapping("/table")
    public ResponseEntity<Map<String, String>> creerTable(
            @RequestBody Map<String, Object> payload) {
        try {
            definitionService.createTable(payload);
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(Map.of("message", "Table initialisée avec succès dans MySQL."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne lors de la création de la table : " + e.getMessage()));
        }
    }

    // =========================================================================
    // GET /api/v1/definitions/fields?tableName=doc_demande_conge
    // Retourne la liste des colonnes (nom, type, nullable) d'une table donnée.
    // =========================================================================
    @GetMapping("/fields")
    public ResponseEntity<?> getFields(
            @RequestParam(name = "tableName") String tableName) {
        try {
            List<Map<String, Object>> fields = definitionService.getFields(tableName);
            return ResponseEntity.ok(fields);
        } catch (TableNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // POST /api/v1/definitions/fields
    // Ajoute des colonnes dynamiques à une table existante.
    // Payload attendu :
    // {
    //   "tableName": "doc_demande_conge",
    //   "columns": [
    //     { "name": "periode_dateDebut", "type": "DATE", "nullable": true }
    //   ]
    // }
    // =========================================================================
    @PostMapping("/fields")
    public ResponseEntity<Map<String, String>> creerChamps(
            @RequestBody Map<String, Object> payload) {
        try {
            definitionService.addColumns(payload);
            return ResponseEntity.ok(Map.of("message", "Champs injectés avec succès dans la table."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne lors de l'ajout des colonnes : " + e.getMessage()));
        }
    }

    // =========================================================================
    // PUT /api/v1/definitions/fields
    // Modifie des colonnes existantes (MODIFY COLUMN).
    // Même structure de payload que POST /definitions/fields.
    // =========================================================================
    @PutMapping("/fields")
    public ResponseEntity<Map<String, String>> modifierChamps(
            @RequestBody Map<String, Object> payload) {
        try {
            definitionService.alterColumns(payload);
            return ResponseEntity.ok(Map.of("message", "Structure des colonnes mise à jour avec succès."));
        } catch (TableNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne lors de la modification : " + e.getMessage()));
        }
    }

    // =========================================================================
    // POST /api/v1/definitions/sync
    // Synchronise automatiquement une table MySQL à partir d'un schéma JSON
    // Payload attendu : { "tableName": "doc_demande_conge", "schema": { ... } }
    // =========================================================================
    @PostMapping("/sync")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, String>> syncSchema(
            @RequestBody Map<String, Object> payload) {
        try {
            String tableName = (String) payload.get("tableName");
            Map<String, Object> schema = (Map<String, Object>) payload.get("schema");

            if (tableName == null || schema == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Les champs 'tableName' et 'schema' sont requis."));
            }

            definitionService.syncSchema(tableName, schema);
            return ResponseEntity.ok(Map.of("message", "Schéma synchronisé avec succès dans MySQL."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne lors de la synchronisation : " + e.getMessage()));
        }
    }
}