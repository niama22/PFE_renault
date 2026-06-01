package com.optiflow.responsable.optimization.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OptimizationResult {
    private List<ProposedTournee> proposedTournees;
    private List<UUID> unscheduledOrderIds;
    private int totalOrders;
    private int scheduledOrders;
    private double averageFillRate;
    private String message;
}
