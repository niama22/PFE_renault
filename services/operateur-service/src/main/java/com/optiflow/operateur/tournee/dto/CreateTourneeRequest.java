package com.optiflow.operateur.tournee.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreateTourneeRequest {

    @NotEmpty(message = "Au moins une commande est requise")
    private List<UUID> orderIds;

    @NotNull(message = "La date de planification est obligatoire")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate plannedDate;

    private String chauffeurId;
    private String chauffeurName;
    private String notes;
}
