package com.optiflow.responsable.truck;

import com.optiflow.responsable.common.ApiResponse;
import com.optiflow.responsable.truck.dto.TruckRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Camions", description = "Gestion de la flotte de camions")
@RestController
@RequestMapping("/api/v1/responsable/trucks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RESPONSABLE')")
public class TruckController {

    private final TruckService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister tous les camions")
    public ResponseEntity<ApiResponse<List<Truck>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @GetMapping("/available")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les camions disponibles")
    public ResponseEntity<ApiResponse<List<Truck>>> getAvailable() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAvailable()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Détail d'un camion")
    public ResponseEntity<ApiResponse<Truck>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    @PostMapping
    @Operation(summary = "Ajouter un camion à la flotte")
    public ResponseEntity<ApiResponse<Truck>> create(@RequestBody @Valid TruckRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Camion ajouté", service.create(req)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un camion")
    public ResponseEntity<ApiResponse<Truck>> update(@PathVariable UUID id,
                                                      @RequestBody @Valid TruckRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Camion mis à jour", service.update(id, req)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Changer le statut d'un camion")
    public ResponseEntity<ApiResponse<Truck>> updateStatus(@PathVariable UUID id,
                                                            @RequestParam TruckStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un camion")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Camion supprimé", null));
    }
}
