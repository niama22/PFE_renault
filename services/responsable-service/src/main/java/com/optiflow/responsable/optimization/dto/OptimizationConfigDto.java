package com.optiflow.responsable.optimization.dto;

import lombok.Data;

@Data
public class OptimizationConfigDto {
    private double clusterRadiusKm  = 80.0;
    private int    dateWindowDays   = 1;
    private boolean availableTrucksOnly = true;
}
