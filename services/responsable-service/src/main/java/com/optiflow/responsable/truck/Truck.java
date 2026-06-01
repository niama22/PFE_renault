package com.optiflow.responsable.truck;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "trucks")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Truck {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "plate_number", unique = true, nullable = false)
    private String plateNumber;

    @Column(nullable = false)
    private String brand;

    @Column(nullable = false)
    private String model;

    @Column(name = "max_weight_kg", nullable = false)
    private double maxWeightKg;

    @Column(name = "max_volume_m3", nullable = false)
    private double maxVolumeM3;

    /** Dimensions intérieures de la caisse (en cm) */
    @Column(name = "internal_length_cm", nullable = false)
    private int internalLengthCm;

    @Column(name = "internal_width_cm", nullable = false)
    private int internalWidthCm;

    @Column(name = "internal_height_cm", nullable = false)
    private int internalHeightCm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TruckStatus status = TruckStatus.AVAILABLE;

    @Column(name = "chauffeur_id")
    private String chauffeurId;

    @Column(name = "chauffeur_name")
    private String chauffeurName;

    @Column
    private String notes;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
