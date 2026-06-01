package com.optiflow.admin.vehicletype;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleTypeRepository extends JpaRepository<VehicleType, Long> {

    List<VehicleType> findByActiveTrue();

    boolean existsByName(String name);
}
