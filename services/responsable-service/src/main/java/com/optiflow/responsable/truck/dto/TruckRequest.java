package com.optiflow.responsable.truck.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class TruckRequest {

    @NotBlank
    private String plateNumber;

    @NotBlank
    private String brand;

    @NotBlank
    private String model;

    @Positive
    private double maxWeightKg;

    @Positive
    private double maxVolumeM3;

    @Positive
    private int internalLengthCm;

    @Positive
    private int internalWidthCm;

    @Positive
    private int internalHeightCm;

    @NotBlank(message = "L'identifiant du chauffeur est obligatoire")
    private String chauffeurId;

    @NotBlank(message = "Le nom du chauffeur est obligatoire")
    private String chauffeurName;

    private String notes;
}
