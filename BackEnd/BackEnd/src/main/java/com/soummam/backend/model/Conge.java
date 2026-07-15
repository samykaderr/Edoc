package com.soummam.backend.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "t_conge")
@DiscriminatorValue("CONGE")
public class Conge extends Document {

    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String typeConge;
    private String motif;
    private String referenceMedicale;

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDate dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDate getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDate dateFin) {
        this.dateFin = dateFin;
    }

    public String getTypeConge() {
        return typeConge;
    }

    public void setTypeConge(String typeConge) {
        this.typeConge = typeConge;
    }

    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }

    public String getReferenceMedicale() {
        return referenceMedicale;
    }

    public void setReferenceMedicale(String referenceMedicale) {
        this.referenceMedicale = referenceMedicale;
    }
}
