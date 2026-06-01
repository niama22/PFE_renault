package com.optiflow.operateur.incident.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResolveIncidentRequest {
    @NotBlank
    private String response;
}
