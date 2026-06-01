package com.optiflow.responsable.tournee;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface TourneeRepository extends JpaRepository<Tournee, UUID> {

    Page<Tournee> findByStatus(TourneeStatus status, Pageable pageable);

    long countByStatus(TourneeStatus status);

    @Query("SELECT COUNT(t) FROM Tournee t WHERE t.status = 'VALIDATED' AND t.validatedAt BETWEEN :start AND :end")
    long countValidatedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(t) FROM Tournee t WHERE t.tourneeNumber LIKE :prefix%")
    long countByTourneeNumberPrefix(@Param("prefix") String prefix);
}
