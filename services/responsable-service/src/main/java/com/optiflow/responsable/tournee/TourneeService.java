package com.optiflow.responsable.tournee;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.responsable.tournee.dto.RejectTourneeRequest;
import com.optiflow.responsable.truck.TruckRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TourneeService {

    private final TourneeRepository tourneeRepository;
    private final TruckRepository truckRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public Page<Tournee> getTournees(TourneeStatus status, Pageable pageable) {
        if (status != null) return tourneeRepository.findByStatus(status, pageable);
        return tourneeRepository.findAll(pageable);
    }

    public Tournee getTournee(UUID id) {
        return tourneeRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tournée introuvable"));
    }

    public Map<String, Long> getStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        Map<String, Long> stats = new HashMap<>();
        stats.put("pendingValidation", tourneeRepository.countByStatus(TourneeStatus.PENDING_RESPONSABLE_VALIDATION));
        stats.put("validated",         tourneeRepository.countByStatus(TourneeStatus.VALIDATED));
        stats.put("inProgress",        tourneeRepository.countByStatus(TourneeStatus.IN_PROGRESS));
        stats.put("completed",         tourneeRepository.countByStatus(TourneeStatus.COMPLETED));
        stats.put("draft",             tourneeRepository.countByStatus(TourneeStatus.DRAFT));
        stats.put("assigned",          tourneeRepository.countByStatus(TourneeStatus.ASSIGNED));
        stats.put("validatedToday",    tourneeRepository.countValidatedBetween(startOfDay, endOfDay));
        stats.put("total",             tourneeRepository.count());
        return stats;
    }

    public Tournee validateTournee(UUID id, String responsableId) {
        Tournee tournee = getTournee(id);
        if (tournee.getStatus() != TourneeStatus.PENDING_RESPONSABLE_VALIDATION) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Seules les tournées en attente de validation peuvent être validées");
        }
        // Auto-fill chauffeur from truck if missing
        if (tournee.getChauffeurId() == null && tournee.getTruckId() != null) {
            truckRepository.findById(tournee.getTruckId()).ifPresent(truck -> {
                tournee.setChauffeurId(truck.getChauffeurId());
                tournee.setChauffeurName(truck.getChauffeurName());
            });
        }
        if (tournee.getChauffeurId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Impossible de valider une tournée sans chauffeur assigné. Associez un chauffeur au camion.");
        }

        tournee.setStatus(TourneeStatus.VALIDATED);
        tournee.setResponsableId(responsableId);
        tournee.setValidatedAt(LocalDateTime.now());
        Tournee saved = tourneeRepository.save(tournee);

        // Orders → PLANNED in operateur_db (shared DB)
        List<String> orderIds = updateOrderStatuses(saved.getOrderIdsJson(), "PLANNED");

        try {
            // Notifier chauffeur-service → création mission
            Map<String, Object> tourneeEvent = new HashMap<>();
            tourneeEvent.put("tourneeId", saved.getId().toString());
            tourneeEvent.put("tourneeNumber", saved.getTourneeNumber());
            tourneeEvent.put("chauffeurId", saved.getChauffeurId());
            tourneeEvent.put("chauffeurName", saved.getChauffeurName());
            tourneeEvent.put("plannedDate", saved.getPlannedDate() != null ? saved.getPlannedDate().toString() : null);
            tourneeEvent.put("orderIdsJson", saved.getOrderIdsJson());
            tourneeEvent.put("operatorNotes", saved.getOperatorNotes());
            tourneeEvent.put("responsableId", saved.getResponsableId());
            kafkaTemplate.send("tournee.validated", saved.getId().toString(),
                objectMapper.writeValueAsString(tourneeEvent));

            // Notifier client-service → commandes.planned pour chaque commande
            for (String orderId : orderIds) {
                Map<String, Object> orderEvent = new HashMap<>();
                orderEvent.put("orderId", orderId);
                orderEvent.put("tourneeNumber", saved.getTourneeNumber());
                orderEvent.put("plannedDate", saved.getPlannedDate() != null ? saved.getPlannedDate().toString() : null);
                kafkaTemplate.send("commandes.planned", orderId,
                    objectMapper.writeValueAsString(orderEvent));
            }
            log.info("Tournée {} validée: {} commande(s) → PLANNED, chauffeur {} notifié",
                saved.getTourneeNumber(), orderIds.size(), saved.getChauffeurId());
        } catch (Exception e) {
            log.warn("Kafka publish failed after tournee validation: {}", e.getMessage());
        }
        return saved;
    }

    public Tournee rejectTournee(UUID id, RejectTourneeRequest request, String responsableId) {
        Tournee tournee = getTournee(id);
        if (tournee.getStatus() != TourneeStatus.PENDING_RESPONSABLE_VALIDATION) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Seules les tournées en attente de validation peuvent être rejetées");
        }
        tournee.setStatus(TourneeStatus.DRAFT);
        tournee.setRejectionReason(request.getReason());
        tournee.setResponsableId(responsableId);
        Tournee saved = tourneeRepository.save(tournee);

        // Remettre les commandes à VALIDATED pour être re-planifiées
        updateOrderStatuses(saved.getOrderIdsJson(), "VALIDATED");
        // Also clear tournee_id link so optimizer can pick them up again
        clearTourneeIdForOrders(saved.getOrderIdsJson());

        log.info("Tournée {} rejetée par {}: {}", saved.getTourneeNumber(), responsableId, request.getReason());
        return saved;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void clearTourneeIdForOrders(String orderIdsJson) {
        if (orderIdsJson == null || orderIdsJson.isBlank()) return;
        try {
            List<String> ids = objectMapper.readValue(orderIdsJson,
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            for (String id : ids) {
                jdbcTemplate.update("UPDATE orders SET tournee_id = NULL WHERE id::text = ?", id);
            }
        } catch (Exception e) {
            log.warn("Failed to clear tournee_id for orders: {}", e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<String> updateOrderStatuses(String orderIdsJson, String newStatus) {
        if (orderIdsJson == null || orderIdsJson.isBlank()) return List.of();
        try {
            List<String> ids = objectMapper.readValue(orderIdsJson,
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            if (ids.isEmpty()) return List.of();
            for (String id : ids) {
                jdbcTemplate.update("UPDATE orders SET status = ? WHERE id::text = ?", newStatus, id);
            }
            log.info("Updated {} order(s) to status {}", ids.size(), newStatus);
            return ids;
        } catch (Exception e) {
            log.warn("Failed to update order statuses: {}", e.getMessage());
            return List.of();
        }
    }
}
