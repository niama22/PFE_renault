package com.optiflow.operateur.order;

import com.optiflow.operateur.common.ApiResponse;
import com.optiflow.operateur.order.dto.RejectOrderRequest;
import com.optiflow.operateur.order.dto.ValidateOrderRequest;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.PatchMapping;

@Tag(name = "Commandes", description = "Gestion des commandes opérateur")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/operateur/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
    @Operation(summary = "Lister les commandes (avec filtre optionnel par statut et client)")
    public ResponseEntity<ApiResponse<Page<Order>>> getOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String clientCode,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrders(status, clientCode, pageable)));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
    @Operation(summary = "Statistiques des commandes par statut")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getOrderStats() {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getStats()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
    @Operation(summary = "Détail d'une commande")
    public ResponseEntity<ApiResponse<Order>> getOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrder(id)));
    }

    @GetMapping("/validated/unplanned")
    @PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
    @Operation(summary = "Commandes validées non encore affectées à une tournée")
    public ResponseEntity<ApiResponse<List<Order>>> getValidatedUnplanned() {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getValidatedUnplannedOrders()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Modifier une commande (date, adresse, chassisIds)")
    public ResponseEntity<ApiResponse<Order>> patch(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> fields) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.patchOrder(id, fields)));
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Valider une commande — assigne un numéro et notifie le client")
    public ResponseEntity<ApiResponse<Order>> validate(
            @PathVariable UUID id,
            @RequestBody ValidateOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Commande validée", orderService.validateOrder(id, request)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Rejeter une commande avec une raison")
    public ResponseEntity<ApiResponse<Order>> reject(
            @PathVariable UUID id,
            @RequestBody @Valid RejectOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Commande rejetée", orderService.rejectOrder(id, request)));
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Importer des commandes depuis un fichier Excel")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> importExcel(
            @RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(ApiResponse.ok(orderService.importFromExcel(file)));
    }
}
