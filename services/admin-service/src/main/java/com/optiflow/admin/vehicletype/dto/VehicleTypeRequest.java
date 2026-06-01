package com.optiflow.admin.vehicletype.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class VehicleTypeRequest {

    @NotBlank
    private String name;

    private String description;

    @Positive
    private Double maxWeightKg;

    @Positive
    private Double maxVolumeM3;
}
