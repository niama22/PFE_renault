package com.optiflow.admin.audit;

import com.optiflow.admin.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Audit", description = "Journal d'audit des événements système")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/admin/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lister les logs d'audit (paginés)")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.getLogs(page, size)));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Logs d'audit pour une entité spécifique")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getByEntity(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.getByEntity(entityType, entityId)));
    }

    @GetMapping("/event/{eventType}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Logs d'audit par type d'événement")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getByEventType(
            @PathVariable String eventType) {
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.getByEventType(eventType)));
    }

    @PostMapping("/login-event")
    @Operation(summary = "Enregistrer une connexion ou déconnexion utilisateur")
    public ResponseEntity<ApiResponse<Void>> recordLoginEvent(
            @RequestBody LoginEventRequest request,
            Authentication auth) {
        String userId = auth != null ? auth.getName() : "unknown";
        String role = (auth != null && auth.getAuthorities() != null)
            ? auth.getAuthorities().stream().findFirst().map(a -> a.getAuthority().replace("ROLE_", "")).orElse("UNKNOWN")
            : "UNKNOWN";
        auditLogService.record(request.getEventType(), "USER", userId, userId, role, request.getDetails());
        return ResponseEntity.ok(ApiResponse.ok("Événement enregistré", null));
    }

    @Data
    static class LoginEventRequest {
        private String eventType;
        private String details;
    }
}
