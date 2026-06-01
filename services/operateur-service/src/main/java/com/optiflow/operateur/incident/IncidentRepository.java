package com.optiflow.operateur.incident;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface IncidentRepository extends JpaRepository<Incident, UUID> {
    Page<Incident> findByStatus(IncidentStatus status, Pageable pageable);
    Page<Incident> findByClientId(String clientId, Pageable pageable);
    Page<Incident> findByOrderId(UUID orderId, Pageable pageable);
}
