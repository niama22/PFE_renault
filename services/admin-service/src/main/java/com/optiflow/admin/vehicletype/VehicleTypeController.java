package com.optiflow.admin.vehicletype;

import com.optiflow.admin.common.ApiResponse;
import com.optiflow.admin.vehicletype.dto.VehicleTypeRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Types de véhicules", description = "Configuration des types de véhicules")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/admin/vehicle-types")
@RequiredArgsConstructor
public class VehicleTypeController {

    private final VehicleTypeService vehicleTypeService;

    @GetMapping
    @Operation(summary = "Lister tous les types de véhicules")
    public ResponseEntity<ApiResponse<List<VehicleType>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(vehicleTypeService.getAll()));
    }

    @GetMapping("/active")
    @Operation(summary = "Lister les types de véhicules actifs")
    public ResponseEntity<ApiResponse<List<VehicleType>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(vehicleTypeService.getActive()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un type de véhicule")
    public ResponseEntity<ApiResponse<VehicleType>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(vehicleTypeService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE')")
    @Operation(summary = "Créer un type de véhicule")
    public ResponseEntity<ApiResponse<VehicleType>> create(@RequestBody @Valid VehicleTypeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Type de véhicule créé", vehicleTypeService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE')")
    @Operation(summary = "Modifier un type de véhicule")
    public ResponseEntity<ApiResponse<VehicleType>> update(
            @PathVariable Long id,
            @RequestBody @Valid VehicleTypeRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Type de véhicule modifié", vehicleTypeService.update(id, req)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE')")
    @Operation(summary = "Désactiver un type de véhicule")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        vehicleTypeService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.ok("Type de véhicule désactivé", null));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE')")
    @Operation(summary = "Activer un type de véhicule")
    public ResponseEntity<ApiResponse<Void>> activate(@PathVariable Long id) {
        vehicleTypeService.activate(id);
        return ResponseEntity.ok(ApiResponse.ok("Type de véhicule activé", null));
    }
}
