package com.optiflow.responsable.optimization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OptimizationConfigRepository extends JpaRepository<OptimizationConfig, Long> {}
