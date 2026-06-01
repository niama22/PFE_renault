package com.optiflow.operateur.order.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ValidateOrderRequest {
    private String notes;
    private LocalDate estimatedArrivalDate;
}
