package com.optiflow.responsable.dashboard;

import com.optiflow.responsable.common.ApiResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/responsable/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RESPONSABLE')")
public class DashboardController {

    @PersistenceContext
    private EntityManager em;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        // ── Commandes ──────────────────────────────────────────────────────────
        List<Object[]> orderRows = em.createNativeQuery(
            "SELECT status, COUNT(*) FROM orders GROUP BY status"
        ).getResultList();

        long ordTotal = 0, ordPending = 0, ordValidated = 0, ordPlanned = 0,
             ordInTransit = 0, ordDelivered = 0, ordRejected = 0,
             ordCancelReq = 0, ordCancelled = 0;

        for (Object[] row : orderRows) {
            String s = (String) row[0];
            long   c = ((Number) row[1]).longValue();
            ordTotal += c;
            switch (s) {
                case "PENDING_VALIDATION"       -> ordPending    += c;
                case "VALIDATED"                -> ordValidated  += c;
                case "PLANNED"                  -> ordPlanned    += c;
                case "IN_TRANSIT"               -> ordInTransit  += c;
                case "DELIVERED"                -> ordDelivered  += c;
                case "REJECTED"                 -> ordRejected   += c;
                case "CANCELLATION_REQUESTED",
                     "CANCELLATION_PENDING"     -> ordCancelReq  += c;
                case "CANCELLED"                -> ordCancelled  += c;
            }
        }

        Map<String, Object> orders = new HashMap<>();
        orders.put("total",       ordTotal);
        orders.put("pending",     ordPending);
        orders.put("validated",   ordValidated);
        orders.put("planned",     ordPlanned);
        orders.put("inTransit",   ordInTransit);
        orders.put("delivered",   ordDelivered);
        orders.put("rejected",    ordRejected);
        orders.put("cancelled",   ordCancelled);
        orders.put("cancelRequested", ordCancelReq);
        stats.put("orders", orders);

        // ── Tournées ───────────────────────────────────────────────────────────
        List<Object[]> tourneeRows = em.createNativeQuery(
            "SELECT status, COUNT(*) FROM tournees GROUP BY status"
        ).getResultList();

        long tTotal = 0, tPending = 0, tValidated = 0, tInProgress = 0, tCompleted = 0;
        for (Object[] row : tourneeRows) {
            String s = (String) row[0];
            long   c = ((Number) row[1]).longValue();
            tTotal += c;
            switch (s) {
                case "PENDING_RESPONSABLE_VALIDATION" -> tPending    += c;
                case "VALIDATED"                      -> tValidated  += c;
                case "IN_PROGRESS"                    -> tInProgress += c;
                case "COMPLETED"                      -> tCompleted  += c;
            }
        }

        Map<String, Object> tournees = new HashMap<>();
        tournees.put("total",             tTotal);
        tournees.put("pendingValidation", tPending);
        tournees.put("validated",         tValidated);
        tournees.put("inProgress",        tInProgress);
        tournees.put("completed",         tCompleted);
        stats.put("tournees", tournees);

        // ── Incidents ──────────────────────────────────────────────────────────
        List<Object[]> incidentRows = em.createNativeQuery(
            "SELECT status, COUNT(*) FROM incidents GROUP BY status"
        ).getResultList();

        long iTotal = 0, iOpen = 0, iInProgress = 0, iResolved = 0, iClosed = 0;
        for (Object[] row : incidentRows) {
            String s = (String) row[0];
            long   c = ((Number) row[1]).longValue();
            iTotal += c;
            switch (s) {
                case "OPEN"        -> iOpen       += c;
                case "IN_PROGRESS" -> iInProgress += c;
                case "RESOLVED"    -> iResolved   += c;
                case "CLOSED"      -> iClosed     += c;
            }
        }

        Map<String, Object> incidents = new HashMap<>();
        incidents.put("total",      iTotal);
        incidents.put("open",       iOpen);
        incidents.put("inProgress", iInProgress);
        incidents.put("resolved",   iResolved);
        incidents.put("closed",     iClosed);
        stats.put("incidents", incidents);

        // ── Annulations ────────────────────────────────────────────────────────
        List<Object[]> cancelRows = em.createNativeQuery(
            "SELECT status, COUNT(*) FROM cancellation_requests GROUP BY status"
        ).getResultList();

        long caTotal = 0, caPending = 0, caApproved = 0, caRejected = 0;
        for (Object[] row : cancelRows) {
            String s = (String) row[0];
            long   c = ((Number) row[1]).longValue();
            caTotal += c;
            switch (s) {
                case "PENDING_OPERATOR", "PENDING_RESPONSABLE" -> caPending  += c;
                case "APPROVED"                                -> caApproved += c;
                case "REJECTED"                                -> caRejected += c;
            }
        }

        Map<String, Object> cancellations = new HashMap<>();
        cancellations.put("total",    caTotal);
        cancellations.put("pending",  caPending);
        cancellations.put("approved", caApproved);
        cancellations.put("rejected", caRejected);
        stats.put("cancellations", cancellations);

        // ── Camions ────────────────────────────────────────────────────────────
        Object truckCount = em.createNativeQuery("SELECT COUNT(*) FROM trucks").getSingleResult();
        stats.put("totalTrucks", ((Number) truckCount).longValue());

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
