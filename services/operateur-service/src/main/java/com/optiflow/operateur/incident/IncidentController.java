package com.optiflow.operateur.incident;

import com.optiflow.operateur.common.ApiResponse;
import com.optiflow.operateur.incident.dto.ResolveIncidentRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Incidents", description = "Gestion des incidents signalés par les clients")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/operateur/incidents")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
public class IncidentController {

    private final IncidentService incidentService;

    @GetMapping
    @Operation(summary = "Lister les incidents")
    public ResponseEntity<ApiResponse<Page<Incident>>> getIncidents(
            @RequestParam(required = false) IncidentStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(incidentService.getIncidents(status, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un incident")
    public ResponseEntity<ApiResponse<Incident>> getIncident(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(incidentService.getIncident(id)));
    }

    @PatchMapping("/{id}/take")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Prendre en charge un incident")
    public ResponseEntity<ApiResponse<Incident>> takeInProgress(
            @PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Incident pris en charge", incidentService.takeInProgress(id, auth.getName())));
    }

    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Résoudre un incident")
    public ResponseEntity<ApiResponse<Incident>> resolve(
            @PathVariable UUID id,
            @RequestBody @Valid ResolveIncidentRequest request,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Incident résolu", incidentService.resolve(id, request, auth.getName())));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Fermer un incident résolu")
    public ResponseEntity<ApiResponse<Incident>> close(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Incident fermé", incidentService.close(id)));
    }
}
