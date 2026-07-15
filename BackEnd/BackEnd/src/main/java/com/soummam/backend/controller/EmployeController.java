package com.soummam.backend.controller;

import com.soummam.backend.model.Employe;
import com.soummam.backend.repository.EmployeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/employes")
@CrossOrigin(origins = "*")
public class EmployeController {

    private final EmployeRepository employeRepository;

    public EmployeController(EmployeRepository employeRepository) {
        this.employeRepository = employeRepository;
    }

    /**
     * GET /api/employes/{id}
     * Retourne uniquement id, nom et prénom de l'employé.
     * Utilisé par le formulaire frontend pour auto-remplir les champs nom/prénom
     * après que l'utilisateur saisit son identifiant.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getEmploye(@PathVariable Integer id) {
        Optional<Employe> optional = employeRepository.findById(id);

        if (optional.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Employé introuvable pour l'identifiant : " + id));
        }

        Employe employe = optional.get();
        return ResponseEntity.ok(Map.of(
                "idEmploye", employe.getIdEmploye(),
                "nom",       employe.getNom(),
                "prenom",    employe.getPrenom(),
                "email",     employe.getEmail() != null ? employe.getEmail() : ""
        ));
    }
}
