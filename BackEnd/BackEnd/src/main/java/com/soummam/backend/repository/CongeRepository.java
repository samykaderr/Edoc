package com.soummam.backend.repository;

import com.soummam.backend.model.Conge;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CongeRepository extends JpaRepository<Conge, String> {
    
}