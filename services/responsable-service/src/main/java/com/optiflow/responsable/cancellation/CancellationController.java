package com.optiflow.responsable.cancellation;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/responsable/cancellations")
@RequiredArgsConstructor
public class CancellationController {

    private final CancellationService service;

    @GetMapping
    @PreAuthorize("hasRole('RESPONSABLE')")
    public ResponseEntity<List<CancellationRecord>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('RESPONSABLE')")
    public ResponseEntity<List<CancellationRecord>> getPending() {
        return ResponseEntity.ok(service.getPending());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE')")
    public ResponseEntity<CancellationRecord> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('RESPONSABLE')")
    public ResponseEntity<CancellationRecord> approve(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.approve(id, jwt.getSubject()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('RESPONSABLE')")
    public ResponseEntity<CancellationRecord> reject(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.getOrDefault("reason", "") : "";
        return ResponseEntity.ok(service.reject(id, jwt.getSubject(), reason));
    }

    @GetMapping("/{id}/document")
    @PreAuthorize("hasAnyRole('RESPONSABLE','OPERATEUR')")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable UUID id) {
        byte[] pdf = service.getDocument(id);
        CancellationRecord rec = service.getById(id);
        String filename = "annulation-" + (rec.getOrderNumber() != null ? rec.getOrderNumber() : id) + ".pdf";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
