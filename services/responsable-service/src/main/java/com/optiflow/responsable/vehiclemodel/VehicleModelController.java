package com.optiflow.responsable.vehiclemodel;

import com.optiflow.responsable.common.ApiResponse;
import com.optiflow.responsable.vehiclemodel.dto.VehicleModelRequest;
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

@Tag(name = "Modèles Véhicules", description = "Catalogue des modèles de véhicules transportables")
@RestController
@RequestMapping("/api/v1/responsable/vehicle-models")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RESPONSABLE')")
public class VehicleModelController {

    private final VehicleModelService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister tous les modèles")
    public ResponseEntity<ApiResponse<List<VehicleModel>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les modèles actifs (pour clients)")
    public ResponseEntity<ApiResponse<List<VehicleModel>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActive()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Détail d'un modèle")
    public ResponseEntity<ApiResponse<VehicleModel>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    @PostMapping
    @Operation(summary = "Créer un modèle de véhicule")
    public ResponseEntity<ApiResponse<VehicleModel>> create(@RequestBody @Valid VehicleModelRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Modèle créé", service.create(req)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un modèle")
    public ResponseEntity<ApiResponse<VehicleModel>> update(@PathVariable UUID id,
                                                             @RequestBody @Valid VehicleModelRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Modèle mis à jour", service.update(id, req)));
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Activer / désactiver un modèle")
    public ResponseEntity<ApiResponse<VehicleModel>> toggle(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(service.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un modèle")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Modèle supprimé", null));
    }
}
