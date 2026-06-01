package com.optiflow.operateur.tournee;

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
@Table(name = "tournees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Tournee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tournee_number", unique = true, nullable = false)
    private String tourneeNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TourneeStatus status;

    @Column(name = "chauffeur_id")
    private String chauffeurId;

    @Column(name = "chauffeur_name")
    private String chauffeurName;

    @Column(name = "planned_date")
    private LocalDate plannedDate;

    @Column(name = "order_ids_json", columnDefinition = "text")
    private String orderIdsJson;

    @Column(name = "operator_id")
    private String operatorId;

    @Column(name = "operator_notes")
    private String operatorNotes;

    @Column(name = "responsable_id")
    private String responsableId;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "truck_id")
    private UUID truckId;

    @Column(name = "fill_rate_percent")
    private Double fillRatePercent;

    @Column(name = "estimated_distance_km")
    private Double estimatedDistanceKm;

    @Column(name = "truck_plate")
    private String truckPlate;

    @Column(name = "truck_label")
    private String truckLabel;

    @JsonIgnore
    @Column(name = "stops_json", columnDefinition = "text")
    private String stopsJson;

    @JsonRawValue
    @JsonProperty("stops")
    public String getStops() {
        return stopsJson != null ? stopsJson : "[]";
    }

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
