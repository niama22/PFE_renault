package com.optiflow.responsable.vehiclemodel;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vehicle_models")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class VehicleModel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Marque du véhicule transporté (ex: Renault, Peugeot) */
    @Column(nullable = false)
    private String brand;

    /** Modèle (ex: Clio, 208) */
    @Column(nullable = false)
    private String model;

    /** Dimensions extérieures du véhicule à transporter (en cm) */
    @Column(name = "length_cm", nullable = false)
    private int lengthCm;

    @Column(name = "width_cm", nullable = false)
    private int widthCm;

    @Column(name = "height_cm", nullable = false)
    private int heightCm;

    @Column(name = "weight_kg", nullable = false)
    private double weightKg;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column
    private String description;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
