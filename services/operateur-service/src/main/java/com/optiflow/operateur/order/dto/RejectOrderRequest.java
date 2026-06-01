package com.optiflow.operateur.order.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectOrderRequest {
    @NotBlank(message = "La raison du rejet est obligatoire")
    private String reason;
}
