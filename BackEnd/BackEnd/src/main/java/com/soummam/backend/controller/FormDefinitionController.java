package com.soummam.backend.controller;

import com.soummam.backend.service.DefinitionService;
import com.soummam.backend.exception.TableNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * FormDefinitionController — Responsabilité unique : Point d'entrée des API d'infrastructure (DDL).
 *
 * Ce contrôleur est le miroir exact de la boîte rouge de l'architecture. Il réceptionne
 * les structures envoyées par le moteur de rendu Front-end sous forme de Maps brutes
 * et délègue toute l'intelligence au DefinitionService.
 */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*") // Évite les blocages CORS avec le serveur de dev React
public class FormDefinitionController {

    private final DefinitionService definitionService;

    // Injection de dépendance par constructeur (recommandé par Spring)
    public FormDefinitionController(DefinitionService definitionService) {
        this.definitionService = definitionService;
    }

    // =========================================================================
    // 1. Initialisation de la Table
    // =========================================================================
    /**
     * Route : POST /api/v1/creerTable
     * Payload attendu : { "tableName": "nom_de_la_table" }
     */
    @PostMapping("/creerTable")
    public ResponseEntity<Map<String, String>> creerTable(@RequestBody Map<String, Object> payload) {
        try {
            definitionService.createTable(payload);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Table initialisée avec succès dans MySQL."));
        } catch (IllegalArgumentException e) {
            // Captures des erreurs de validation d'identifiants (Regex)
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne lors de la création de la table : " + e.getMessage()));
        }
    }

    // =========================================================================
    // 2. Ajout dynamique de colonnes
    // =========================================================================
    /**
     * Route : POST /api/v1/creerChamps
     * Payload attendu :
     * {
     *   "tableName": "nom_table",
     *   "columns": [
     *     { "name": "mon_champ", "type": "TEXT", "nullable": true }
     *   ]
     * }
     */
    @PostMapping("/creerChamps")
    public ResponseEntity<Map<String, String>> creerChamps(@RequestBody Map<String, Object> payload) {
        try {
            // Appelle la méthode addColumns du service
            definitionService.addColumns(payload);
            return ResponseEntity.ok(Map.of("message", "Champs injectés avec succès dans la table."));
        } catch (IllegalArgumentException e) {
            // Captures des types SQL non autorisés ou listes vides
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne lors de l'ajout des colonnes : " + e.getMessage()));
        }
    }

    // =========================================================================
    // 3. Altération/Modification des colonnes
    // =========================================================================
    /**
     * Route : PUT /api/v1/modifierChamps
     * Payload attendu : Même structure que creerChamps
     */
    @PutMapping("/modifierChamps")
    public ResponseEntity<Map<String, String>> modifierChamps(@RequestBody Map<String, Object> payload) {
        try {
            // Appelle la méthode alterColumns du service
            definitionService.alterColumns(payload);
            return ResponseEntity.ok(Map.of("message", "Structure des colonnes mise à jour avec succès."));
        } catch (TableNotFoundException e) {
            // Renvoie un code 404 propre si la table n'existe pas dans information_schema
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne lors de la modification : " + e.getMessage()));
        }
    }
}