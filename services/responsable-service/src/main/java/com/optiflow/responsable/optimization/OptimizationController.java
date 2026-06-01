package com.optiflow.responsable.optimization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.responsable.common.ApiResponse;
import com.optiflow.responsable.optimization.dto.*;
import com.optiflow.responsable.tournee.Tournee;
import com.optiflow.responsable.tournee.TourneeRepository;
import com.optiflow.responsable.tournee.TourneeStatus;
import com.optiflow.responsable.truck.Truck;
import com.optiflow.responsable.truck.TruckRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Tag(name = "Optimisation", description = "Moteur de planification des tournées")
@Slf4j
@RestController
@RequestMapping("/api/v1/responsable/optimization")
@RequiredArgsConstructor
public class OptimizationController {

    private final OptimizationService          service;
    private final OptimizationConfigRepository configRepo;
    private final TourneeRepository            tourneeRepository;
    private final TruckRepository              truckRepository;
    private final ObjectMapper                 objectMapper;
    private final JdbcTemplate                 jdbcTemplate;
    private final org.springframework.kafka.core.KafkaTemplate<String, String> kafkaTemplate;

    // ── Lancer l'optimisation (opérateur) ────────────────────────────────────

    @PostMapping("/run")
    @PreAuthorize("hasRole('OPERATEUR') or hasRole('RESPONSABLE')")
    @Operation(summary = "Lancer le moteur (opérateur)",
               description = "Utilise la config sauvegardée si le body est vide.")
    public ResponseEntity<ApiResponse<OptimizationResult>> run(
            @RequestBody(required = false) OptimizationRequest req) {

        // Si l'opérateur ne passe pas de paramètres → utiliser la config du responsable
        if (req == null) {
            OptimizationConfig cfg = loadConfig();
            req = new OptimizationRequest();
            req.setClusterRadiusKm(cfg.getClusterRadiusKm());
            req.setDateWindowDays(cfg.getDateWindowDays());
            req.setAvailableTrucksOnly(cfg.isAvailableTrucksOnly());
        }

        OptimizationResult result = service.optimize(req);
        return ResponseEntity.ok(ApiResponse.ok(result.getMessage(), result));
    }

    // ── Lire la configuration (responsable + opérateur) ───────────────────────

    @GetMapping("/config")
    @PreAuthorize("hasRole('RESPONSABLE') or hasRole('OPERATEUR')")
    @Operation(summary = "Lire la configuration du moteur")
    public ResponseEntity<ApiResponse<OptimizationConfigDto>> getConfig() {
        OptimizationConfig cfg = loadConfig();
        return ResponseEntity.ok(ApiResponse.ok("Configuration chargée", toDto(cfg)));
    }

    // ── Sauvegarder la configuration (responsable uniquement) ─────────────────

    @PutMapping("/config")
    @PreAuthorize("hasRole('RESPONSABLE')")
    @Operation(summary = "Sauvegarder la configuration du moteur (responsable)")
    public ResponseEntity<ApiResponse<OptimizationConfigDto>> saveConfig(
            @RequestBody OptimizationConfigDto dto) {

        OptimizationConfig cfg = loadConfig();
        cfg.setClusterRadiusKm(dto.getClusterRadiusKm());
        cfg.setDateWindowDays(dto.getDateWindowDays());
        cfg.setAvailableTrucksOnly(dto.isAvailableTrucksOnly());
        configRepo.save(cfg);
        return ResponseEntity.ok(ApiResponse.ok("Configuration sauvegardée", toDto(cfg)));
    }

    // ── Confirmer le planning (opérateur → responsable) ──────────────────────

    @PostMapping("/confirm")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Confirmer le planning et soumettre au responsable",
               description = "Crée les tournées avec statut PENDING_RESPONSABLE_VALIDATION.")
    public ResponseEntity<ApiResponse<List<ConfirmedTourneeDto>>> confirmPlanning(
            @RequestBody ConfirmPlanningRequest req,
            @AuthenticationPrincipal Jwt jwt) {

        String operatorId = jwt.getSubject();
        String datePrefix = "OPT-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        long existing = tourneeRepository.countByTourneeNumberPrefix(datePrefix);

        // Cancel any PENDING tournées that contain orders being re-planned
        Set<String> allOrderIds = req.getProposedTournees().stream()
            .flatMap(pt -> pt.getStops().stream())
            .flatMap(s -> {
                List<UUID> ids = s.getOrderIds() != null && !s.getOrderIds().isEmpty()
                    ? s.getOrderIds() : List.of(s.getOrderId());
                return ids.stream().map(UUID::toString);
            })
            .collect(java.util.stream.Collectors.toSet());
        if (!allOrderIds.isEmpty()) {
            String idList = allOrderIds.stream().map(id -> "'" + id + "'").collect(Collectors.joining(","));
            try {
                jdbcTemplate.update(
                    "UPDATE tournees SET status = 'DRAFT', rejection_reason = 'Remplacée par un nouveau planning' " +
                    "WHERE id IN (" +
                    "  SELECT DISTINCT tournee_id FROM orders " +
                    "  WHERE id::text IN (" + idList + ") AND tournee_id IS NOT NULL" +
                    ") AND status = 'PENDING_RESPONSABLE_VALIDATION'"
                );
            } catch (Exception e) {
                log.warn("Could not cancel old pending tournées: {}", e.getMessage());
            }
        }

        List<ConfirmedTourneeDto> confirmed = new ArrayList<>();

        for (int i = 0; i < req.getProposedTournees().size(); i++) {
            ProposedTournee pt = req.getProposedTournees().get(i);

            String tourneeNumber = datePrefix + String.format("%03d", existing + i + 1);

            // Build orderIdsJson — inclut tous les orderIds de chaque arrêt (adresses fusionnées)
            String orderIdsJson = "[" + pt.getStops().stream()
                    .flatMap(s -> {
                        List<UUID> ids = s.getOrderIds() != null && !s.getOrderIds().isEmpty()
                            ? s.getOrderIds() : List.of(s.getOrderId());
                        return ids.stream();
                    })
                    .distinct()
                    .map(id -> "\"" + id + "\"")
                    .collect(Collectors.joining(",")) + "]";

            // Parse planned date
            LocalDate plannedDate;
            try {
                plannedDate = (pt.getPlannedDate() != null && !pt.getPlannedDate().isBlank())
                        ? LocalDate.parse(pt.getPlannedDate())
                        : LocalDate.now().plusDays(1);
            } catch (Exception e) {
                plannedDate = LocalDate.now().plusDays(1);
            }

            String stopsJson;
            try {
                stopsJson = objectMapper.writeValueAsString(pt.getStops());
            } catch (Exception e) {
                log.warn("Failed to serialize stops for tournee {}: {}", tourneeNumber, e.getMessage());
                stopsJson = "[]";
            }

            // Lookup chauffeur from truck
            String chauffeurId = null;
            String chauffeurName = null;
            if (pt.getTruckId() != null) {
                Truck truck = truckRepository.findById(pt.getTruckId()).orElse(null);
                if (truck != null && truck.getChauffeurId() != null) {
                    chauffeurId = truck.getChauffeurId();
                    chauffeurName = truck.getChauffeurName();
                }
            }

            Tournee tournee = Tournee.builder()
                    .tourneeNumber(tourneeNumber)
                    .status(TourneeStatus.PENDING_RESPONSABLE_VALIDATION)
                    .truckId(pt.getTruckId())
                    .truckPlate(pt.getTruckPlate())
                    .truckLabel(pt.getTruckLabel())
                    .chauffeurId(chauffeurId)
                    .chauffeurName(chauffeurName)
                    .plannedDate(plannedDate)
                    .orderIdsJson(orderIdsJson)
                    .stopsJson(stopsJson)
                    .fillRatePercent(pt.getFillRatePercent())
                    .estimatedDistanceKm(pt.getEstimatedDistanceKm())
                    .operatorId(operatorId)
                    .operatorNotes(req.getOperatorNotes())
                    .build();

            Tournee saved = tourneeRepository.save(tournee);

            // Mark ALL orders in each stop as PLANNED and publish commandes.planned
            for (DeliveryStop stop : pt.getStops()) {
                List<UUID> stopOrderIds = stop.getOrderIds() != null && !stop.getOrderIds().isEmpty()
                    ? stop.getOrderIds() : List.of(stop.getOrderId());
                for (UUID oid : stopOrderIds) {
                    try {
                        jdbcTemplate.update(
                            "UPDATE orders SET status = 'PLANNED', tournee_id = ?::uuid WHERE id::text = ?",
                            saved.getId().toString(), oid.toString()
                        );
                        // Notify client-service
                        String evt = objectMapper.writeValueAsString(
                            Map.of("orderId", oid.toString(), "tourneeNumber", tourneeNumber));
                        kafkaTemplate.send("commandes.planned", evt);
                    } catch (Exception e) {
                        log.warn("Could not update order {} to PLANNED: {}", oid, e.getMessage());
                    }
                }
            }

            confirmed.add(ConfirmedTourneeDto.builder()
                    .id(saved.getId())
                    .tourneeNumber(tourneeNumber)
                    .truckPlate(pt.getTruckPlate())
                    .truckLabel(pt.getTruckLabel())
                    .plannedDate(plannedDate.toString())
                    .orderCount(pt.getStops().size())
                    .fillRatePercent(pt.getFillRatePercent())
                    .estimatedDistanceKm(pt.getEstimatedDistanceKm())
                    .status("PENDING_RESPONSABLE_VALIDATION")
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.ok(
                confirmed.size() + " tournée(s) soumise(s) au responsable pour validation finale",
                confirmed));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private OptimizationConfig loadConfig() {
        return configRepo.findById(1L).orElseGet(() -> {
            OptimizationConfig def = OptimizationConfig.builder().id(1L).build();
            return configRepo.save(def);
        });
    }

    private OptimizationConfigDto toDto(OptimizationConfig c) {
        OptimizationConfigDto dto = new OptimizationConfigDto();
        dto.setClusterRadiusKm(c.getClusterRadiusKm());
        dto.setDateWindowDays(c.getDateWindowDays());
        dto.setAvailableTrucksOnly(c.isAvailableTrucksOnly());
        return dto;
    }
}
