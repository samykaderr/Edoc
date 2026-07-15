package com.soummam.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "t_document")
// C'est cette annotation magique qui configure l'héritage partagé en BDD
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "type_document", discriminatorType = DiscriminatorType.STRING)
public abstract class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "type_document", insertable = false, updatable = false)
    private String typeDocument;

    private String statut = "NEW"; // Statut par défaut demandé par l'archi

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Column(name = "id_employe", nullable = false)
    private Integer idEmploye;

    // --- Getters et Setters ---
    public String getId() {
        return id;
    }
    public void setId(String id) {
        this.id = id;
    }

    public String getTypeDocument() {
        return typeDocument;
    }

    public String getStatut() {
        return statut;
    }
    public void setStatut(String statut) {
        this.statut = statut;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation; }

    public Integer getIdEmploye() { return idEmploye; }

    public void setIdEmploye(Integer idEmploye) { this.idEmploye = idEmploye; }
}