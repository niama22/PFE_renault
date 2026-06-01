package com.optiflow.responsable.optimization.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class ConfirmedTourneeDto {
    private UUID id;
    private String tourneeNumber;
    private String truckPlate;
    private String truckLabel;
    private String plannedDate;
    private int orderCount;
    private double fillRatePercent;
    private double estimatedDistanceKm;
    private String status;
}
