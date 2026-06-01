package com.optiflow.responsable.optimization;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "optimization_config")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class OptimizationConfig {

    /** Toujours 1 — table singleton */
    @Id
    private Long id = 1L;

    @Column(name = "cluster_radius_km", nullable = false)
    @Builder.Default
    private double clusterRadiusKm = 80.0;

    @Column(name = "date_window_days", nullable = false)
    @Builder.Default
    private int dateWindowDays = 1;

    @Column(name = "available_trucks_only", nullable = false)
    @Builder.Default
    private boolean availableTrucksOnly = true;
}
