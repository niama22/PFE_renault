package com.optiflow.responsable.truck;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TruckRepository extends JpaRepository<Truck, UUID> {
    List<Truck> findByStatus(TruckStatus status);
    boolean existsByPlateNumber(String plateNumber);
}
