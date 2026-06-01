package com.optiflow.operateur.tournee.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignChauffeurRequest {
    @NotBlank
    private String chauffeurId;

    @NotBlank
    private String chauffeurName;
}
