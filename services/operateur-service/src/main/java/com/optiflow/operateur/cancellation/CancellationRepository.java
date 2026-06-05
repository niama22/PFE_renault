package com.optiflow.operateur.cancellation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CancellationRepository extends JpaRepository<CancellationRequest, UUID> {
    List<CancellationRequest> findAllByOrderByCreatedAtDesc();
    Optional<CancellationRequest> findByOrderId(UUID orderId);
    List<CancellationRequest> findByStatus(CancellationStatus status);
}
