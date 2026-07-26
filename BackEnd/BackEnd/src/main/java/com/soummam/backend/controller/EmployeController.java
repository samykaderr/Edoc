package com.soummam.backend.controller;

import com.soummam.backend.model.Employe;
import com.soummam.backend.repository.EmployeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/employes")
@CrossOrigin(origins = "*")
public class EmployeController {

    private final EmployeRepository employeRepository;

    public EmployeController(EmployeRepository employeRepository) {
        this.employeRepository = employeRepository;
    }

    /**
     * GET /api/v1/employes
     * Retourne la liste complète des employés.
     */
    @GetMapping
    public ResponseEntity<List<Employe>> getAllEmployes() {
        return ResponseEntity.ok(employeRepository.findAll());
    }

    /**
     * GET /api/v1/employes/{id}
     * Retourne les données d'un employé selon son identifiant (matricule).
     */
    @GetMapping("/{id}")
    public ResponseEntity<Employe> getEmployeById(@PathVariable Integer id) {
        return employeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}