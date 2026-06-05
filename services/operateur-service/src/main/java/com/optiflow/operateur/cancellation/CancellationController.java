package com.optiflow.operateur.cancellation;

import com.optiflow.operateur.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/operateur/cancellations")
@RequiredArgsConstructor
public class CancellationController {

    private final CancellationService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATEUR','RESPONSABLE')")
    public ResponseEntity<ApiResponse<List<CancellationRequest>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('OPERATEUR')")
    public ResponseEntity<ApiResponse<List<CancellationRequest>>> getPending() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPending()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OPERATEUR','RESPONSABLE')")
    public ResponseEntity<ApiResponse<CancellationRequest>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    @PostMapping("/{id}/forward")
    @PreAuthorize("hasRole('OPERATEUR')")
    public ResponseEntity<ApiResponse<CancellationRequest>> forward(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        String operateurId = jwt.getSubject();
        return ResponseEntity.ok(ApiResponse.ok("Demande transmise au responsable",
            service.forwardToResponsable(id, operateurId)));
    }

    @GetMapping("/{id}/document")
    @PreAuthorize("hasAnyRole('OPERATEUR','RESPONSABLE')")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable UUID id) {
        byte[] pdf = service.getDocument(id);
        CancellationRequest req = service.getById(id);
        String filename = "annulation-" + (req.getOrderNumber() != null ? req.getOrderNumber() : id) + ".pdf";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
