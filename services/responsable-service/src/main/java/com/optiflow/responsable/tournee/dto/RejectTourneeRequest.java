package com.optiflow.responsable.tournee.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectTourneeRequest {
    @NotBlank(message = "La raison du rejet est obligatoire")
    private String reason;
}
