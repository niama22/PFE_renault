package com.optiflow.responsable.cancellation;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cancellation_records")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CancellationRecord {

    @Id
    private UUID id; // = cancellationId from operateur

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "order_number")
    private String orderNumber;

    @Column(name = "client_id")
    private String clientId;

    @Column(name = "client_code")
    private String clientCode;

    @Column(name = "client_name")
    private String clientName;

    @Column(name = "client_company")
    private String clientCompany;

    @Column(name = "delivery_address_json", columnDefinition = "TEXT")
    private String deliveryAddressJson;

    @Column(name = "all_vehicles_json", columnDefinition = "TEXT")
    private String allVehiclesJson;

    @Column(name = "requested_vehicles_json", columnDefinition = "TEXT")
    private String requestedVehiclesJson;

    @Column(name = "reason", length = 2000)
    private String reason;

    @Column(name = "operateur_id")
    private String operateurId;

    @Column(name = "responsable_id")
    private String responsableId;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CancellationStatus status;

    @Column(name = "document_data", columnDefinition = "BYTEA")
    private byte[] documentData;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
