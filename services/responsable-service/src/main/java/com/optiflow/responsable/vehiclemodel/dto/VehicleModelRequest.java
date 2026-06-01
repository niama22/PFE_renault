package com.optiflow.responsable.vehiclemodel.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class VehicleModelRequest {

    @NotBlank
    private String brand;

    @NotBlank
    private String model;

    @Positive
    private int lengthCm;

    @Positive
    private int widthCm;

    @Positive
    private int heightCm;

    @Positive
    private double weightKg;

    private String description;
}
