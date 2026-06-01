package com.optiflow.responsable.tournee;

import com.optiflow.responsable.common.ApiResponse;
import com.optiflow.responsable.tournee.dto.RejectTourneeRequest;
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

@Tag(name = "Tournées – Responsable", description = "Validation et supervision des tournées")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/responsable/tournees")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RESPONSABLE')")
public class TourneeController {

    private final TourneeService tourneeService;

    @GetMapping
    @Operation(summary = "Lister les tournées")
    public ResponseEntity<ApiResponse<Page<Tournee>>> getTournees(
            @RequestParam(required = false) TourneeStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(tourneeService.getTournees(status, pageable)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des tournées")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(tourneeService.getStats()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une tournée")
    public ResponseEntity<ApiResponse<Tournee>> getTournee(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(tourneeService.getTournee(id)));
    }

    @PatchMapping("/{id}/validate")
    @Operation(summary = "Valider une tournée soumise")
    public ResponseEntity<ApiResponse<Tournee>> validate(
            @PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok("Tournée validée",
            tourneeService.validateTournee(id, auth.getName())));
    }

    @PatchMapping("/{id}/reject")
    @Operation(summary = "Rejeter une tournée soumise")
    public ResponseEntity<ApiResponse<Tournee>> reject(
            @PathVariable UUID id,
            @RequestBody @Valid RejectTourneeRequest request,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok("Tournée rejetée",
            tourneeService.rejectTournee(id, request, auth.getName())));
    }
}
