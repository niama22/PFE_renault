package com.optiflow.responsable.optimization.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class OptimizationRequest {

    /** IDs des commandes à planifier — vide = toutes les commandes VALIDATED */
    private List<UUID> orderIds;

    /** Rayon de clustering géographique en km (défaut 80 km) */
    private double clusterRadiusKm = 80.0;

    /** Fenêtre de regroupement par date en jours (défaut 1 = même jour ± 1 jour) */
    private int dateWindowDays = 1;

    /** Utiliser uniquement les camions AVAILABLE (défaut true) */
    private boolean availableTrucksOnly = true;
}
