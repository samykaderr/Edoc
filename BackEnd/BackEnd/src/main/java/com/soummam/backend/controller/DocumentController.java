package com.soummam.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soummam.backend.model.Conge;
import com.soummam.backend.repository.CongeRepository;
import com.soummam.backend.service.JsonValidationService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "*")
public class DocumentController {

    private final JsonValidationService validationService;
    private final CongeRepository congeRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DocumentController(JsonValidationService validationService, CongeRepository congeRepository) {
        this.validationService = validationService;
        this.congeRepository = congeRepository;
    }

    public record DocumentTypeView(String code, String title, String description, String schemaName) {
    }

    @GetMapping
    public List<DocumentTypeView> listDocumentTypes() {
        return List.of(
                new DocumentTypeView(
                        "CONGE",
                        "Demande de congé",
                        "Formulaire de demande de congé avec validation Numerique .",
                        "demande_conge"
                )
        );
    }

    @GetMapping(value = "/schemas/{schemaName}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getSchema(@PathVariable String schemaName) {
        if (!schemaName.matches("[a-zA-Z0-9_-]+")) {
            return ResponseEntity.badRequest().body("{\"error\":\"Nom de schéma invalide\"}");
        }

        try {
            Resource resource = new ClassPathResource("schema/" + schemaName + ".json");
            if (!resource.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("{\"error\":\"Schéma introuvable\"}");
            }

            String schemaContent = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            return ResponseEntity.ok(schemaContent);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\":\"Impossible de lire le schéma\"}");
        }
    }

    /**
     * Endpoint : POST http://localhost:8080/api/documents/soumettre
     */
    @PostMapping("/soumettre")
    public ResponseEntity<String> soumettreDocument(@RequestBody String jsonPayload) {
        try {
            // 1. Passer au moteur de validation
            validationService.validateDocument(jsonPayload);

            // 2. Convertisseur JSON ==> Entité Java (comme sur votre schéma !)
            Conge conge = objectMapper.readValue(jsonPayload, Conge.class);

            // Le statut "NEW" et la date sont gérés automatiquement par l'entité
            // 3. Sauvegarde via JPA (remplit t_document et t_conge automatiquement)
            Conge savedConge = congeRepository.save(conge);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body("{ \"message\": \"Document enregistré avec succès !\", \"id\": \"" + savedConge.getId() + "\" }");

        } catch (IllegalArgumentException e) {
            // Erreur de validation du schéma JSON (Ex: un champ requis est manquant)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{ \"error\": \"" + e.getMessage() + "\" }");
        } catch (Exception e) {
            // Toute autre erreur technique
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{ \"error\": \"Erreur interne : " + e.getMessage() + "\" }");
        }
    }
}