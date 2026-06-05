package com.optiflow.responsable.cancellation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CancellationRecordRepository extends JpaRepository<CancellationRecord, UUID> {
    List<CancellationRecord> findAllByOrderByCreatedAtDesc();
    List<CancellationRecord> findByStatus(CancellationStatus status);
}
