package com.optiflow.operateur.tournee.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectTourneeRequest {
    @NotBlank(message = "Le motif de rejet est obligatoire")
    private String reason;
}
