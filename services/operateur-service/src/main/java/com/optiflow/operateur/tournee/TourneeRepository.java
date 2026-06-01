package com.optiflow.operateur.tournee;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface TourneeRepository extends JpaRepository<Tournee, UUID> {

    Page<Tournee> findByStatus(TourneeStatus status, Pageable pageable);

    Page<Tournee> findByChauffeurId(String chauffeurId, Pageable pageable);

    long countByStatus(TourneeStatus status);

    @Query("SELECT COUNT(t) FROM Tournee t WHERE t.validatedAt >= :start AND t.validatedAt < :end AND t.status = 'VALIDATED'")
    long countValidatedBetween(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COUNT(t) FROM Tournee t WHERE t.tourneeNumber LIKE :prefix%")
    long countByTourneeNumberPrefix(@Param("prefix") String prefix);
}
