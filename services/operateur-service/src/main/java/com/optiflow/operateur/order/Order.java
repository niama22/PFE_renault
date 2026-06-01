package com.optiflow.operateur.order;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonRawValue;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Order {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "order_number", unique = true)
    private String orderNumber;

    @Column(name = "client_id", nullable = false)
    private String clientId;

    @Column(name = "client_code")
    private String clientCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @JsonIgnore
    @Column(name = "vehicles_json", columnDefinition = "text", nullable = false)
    private String vehiclesJson;

    @JsonRawValue
    @JsonProperty("vehicles")
    public String getVehicles() {
        return vehiclesJson != null ? vehiclesJson : "[]";
    }

    @Column(name = "requested_delivery_date")
    private LocalDate requestedDeliveryDate;

    @JsonIgnore
    @Column(name = "delivery_address_json", columnDefinition = "text")
    private String deliveryAddressJson;

    @JsonRawValue
    @JsonProperty("deliveryAddress")
    public String getDeliveryAddress() {
        return deliveryAddressJson != null ? deliveryAddressJson : "null";
    }

    @Column(name = "delivery_lat")
    private Double deliveryLat;

    @Column(name = "delivery_lng")
    private Double deliveryLng;

    @Column(name = "estimated_arrival_date")
    private LocalDate estimatedArrivalDate;

    @Column(name = "operator_notes")
    private String operatorNotes;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "tournee_id")
    private UUID tourneeId;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
