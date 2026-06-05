package com.optiflow.operateur.tournee;

import com.optiflow.operateur.common.ApiResponse;
import com.optiflow.operateur.tournee.dto.AssignChauffeurRequest;
import com.optiflow.operateur.tournee.dto.CreateTourneeRequest;
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

import java.util.Map;
import java.util.UUID;

@Tag(name = "Tournées", description = "Planification des tournées par l'opérateur")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/operateur/tournees")
@RequiredArgsConstructor
public class TourneeController {

    private final TourneeService tourneeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
    @Operation(summary = "Lister les tournées")
    public ResponseEntity<ApiResponse<Page<Tournee>>> getTournees(
            @RequestParam(required = false) TourneeStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(tourneeService.getTournees(status, pageable)));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
    @Operation(summary = "Statistiques des tournées")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(tourneeService.getStats()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
    @Operation(summary = "Détail d'une tournée")
    public ResponseEntity<ApiResponse<Tournee>> getTournee(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(tourneeService.getTournee(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Créer une tournée à partir de commandes validées")
    public ResponseEntity<ApiResponse<Tournee>> create(
            @RequestBody @Valid CreateTourneeRequest request,
            Authentication auth) throws Exception {
        return ResponseEntity.ok(ApiResponse.ok("Tournée créée",
            tourneeService.create(request, auth.getName())));
    }

    @PatchMapping("/{id}/assign-chauffeur")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Assigner un chauffeur à une tournée")
    public ResponseEntity<ApiResponse<Tournee>> assignChauffeur(
            @PathVariable UUID id,
            @RequestBody @Valid AssignChauffeurRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(tourneeService.assignChauffeur(id, request)));
    }

    @PatchMapping("/{id}/submit")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Soumettre la tournée au responsable pour validation")
    public ResponseEntity<ApiResponse<Tournee>> submit(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Tournée soumise au responsable",
            tourneeService.submitForValidation(id)));
    }

}
