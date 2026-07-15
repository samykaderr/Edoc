package com.soummam.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "t_employe")
public class Employe {

    @Id
    @Column(name = "id_employe")
    private Integer idEmploye;

    @Column(name = "nom", nullable = false, length = 100)
    private String nom;

    @Column(name = "prenom", nullable = false, length = 100)
    private String prenom;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "departement", length = 100)
    private String departement;

    public Employe() {}

    public Integer getIdEmploye() { return idEmploye; }
    public void setIdEmploye(Integer idEmploye) { this.idEmploye = idEmploye; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDepartement() { return departement; }
    public void setDepartement(String departement) { this.departement = departement; }
}
