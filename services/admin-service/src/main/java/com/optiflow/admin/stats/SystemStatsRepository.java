package com.optiflow.admin.stats;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface SystemStatsRepository extends JpaRepository<SystemStats, Long> {

    @Modifying
    @Transactional
    @Query("UPDATE SystemStats s SET s.ordersPending = s.ordersPending + :delta WHERE s.id = 1")
    void incrementOrdersPending(long delta);

    @Modifying
    @Transactional
    @Query("UPDATE SystemStats s SET s.ordersValidated = s.ordersValidated + 1, s.ordersPending = GREATEST(s.ordersPending - 1, 0) WHERE s.id = 1")
    void onOrderValidated();

    @Modifying
    @Transactional
    @Query("UPDATE SystemStats s SET s.ordersRejected = s.ordersRejected + 1, s.ordersPending = GREATEST(s.ordersPending - 1, 0) WHERE s.id = 1")
    void onOrderRejected();

    @Modifying
    @Transactional
    @Query("UPDATE SystemStats s SET s.incidentsOpen = s.incidentsOpen + 1 WHERE s.id = 1")
    void incrementIncidentsOpen();

    @Modifying
    @Transactional
    @Query("UPDATE SystemStats s SET s.incidentsResolved = s.incidentsResolved + 1, s.incidentsOpen = GREATEST(s.incidentsOpen - 1, 0) WHERE s.id = 1")
    void onIncidentResolved();

    @Modifying
    @Transactional
    @Query("UPDATE SystemStats s SET s.tourneesPendingValidation = s.tourneesPendingValidation + 1 WHERE s.id = 1")
    void incrementTourneesPending();

    @Modifying
    @Transactional
    @Query("UPDATE SystemStats s SET s.tourneesValidated = s.tourneesValidated + 1, s.tourneesPendingValidation = GREATEST(s.tourneesPendingValidation - 1, 0) WHERE s.id = 1")
    void onTourneeValidated();
}
