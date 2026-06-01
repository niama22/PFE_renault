package com.optiflow.responsable.optimization.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ProposedTournee {
    private UUID truckId;
    private String truckPlate;
    private String truckLabel;
    private double truckMaxWeightKg;
    private double truckMaxVolumeM3;

    /** Fenêtre de date de livraison ciblée (ex: "2026-06-15") */
    private String plannedDate;

    private List<DeliveryStop> stops;

    private double totalWeightKg;
    private double totalVolumeM3;
    private double fillRatePercent;
    private double estimatedDistanceKm;
    private int totalOrders;
}
