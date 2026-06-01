package com.optiflow.responsable.vehiclemodel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VehicleModelRepository extends JpaRepository<VehicleModel, UUID> {
    List<VehicleModel> findByActiveTrue();
    boolean existsByBrandAndModel(String brand, String model);
}
