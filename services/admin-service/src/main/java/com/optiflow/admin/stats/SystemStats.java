package com.optiflow.admin.stats;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_stats")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class SystemStats {

    @Id
    private Long id = 1L;

    @Column(name = "orders_pending")
    private long ordersPending = 0;

    @Column(name = "orders_validated")
    private long ordersValidated = 0;

    @Column(name = "orders_rejected")
    private long ordersRejected = 0;

    @Column(name = "orders_planned")
    private long ordersPlanned = 0;

    @Column(name = "orders_in_transit")
    private long ordersInTransit = 0;

    @Column(name = "orders_delivered")
    private long ordersDelivered = 0;

    @Column(name = "incidents_open")
    private long incidentsOpen = 0;

    @Column(name = "incidents_in_progress")
    private long incidentsInProgress = 0;

    @Column(name = "incidents_resolved")
    private long incidentsResolved = 0;

    @Column(name = "tournees_pending_validation")
    private long tourneesPendingValidation = 0;

    @Column(name = "tournees_validated")
    private long tourneesValidated = 0;

    @Column(name = "tournees_in_progress")
    private long tourneesInProgress = 0;

    @Column(name = "tournees_completed")
    private long tourneesCompleted = 0;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
