package com.optiflow.operateur.message;

import com.optiflow.operateur.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Messages", description = "Messagerie opérateur ↔ chauffeur")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/operateur/messages")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATEUR', 'RESPONSABLE')")
public class MessageController {

    private final MessageService service;

    @GetMapping("/threads")
    @Operation(summary = "Lister toutes les conversations (dernier message par mission)")
    public ResponseEntity<ApiResponse<List<OperateurMessage>>> getThreads() {
        return ResponseEntity.ok(ApiResponse.ok(service.getThreads()));
    }

    @GetMapping("/mission/{missionId}")
    @Operation(summary = "Fil de discussion d'une mission")
    public ResponseEntity<ApiResponse<List<OperateurMessage>>> getThread(
            @PathVariable String missionId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getThread(missionId)));
    }

    @GetMapping("/mission/{missionId}/unread")
    @Operation(summary = "Nombre de messages non lus du chauffeur")
    public ResponseEntity<ApiResponse<Long>> countUnread(@PathVariable String missionId) {
        return ResponseEntity.ok(ApiResponse.ok(service.countUnread(missionId)));
    }

    @PostMapping("/mission/{missionId}/reply")
    @PreAuthorize("hasRole('OPERATEUR')")
    @Operation(summary = "Répondre au chauffeur")
    public ResponseEntity<ApiResponse<OperateurMessage>> reply(
            @PathVariable String missionId,
            @RequestBody @Valid ReplyRequest req,
            Authentication auth) {
        String operatorName = auth.getName();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            String preferred = jwt.getClaimAsString("preferred_username");
            if (preferred != null) operatorName = preferred;
        }
        return ResponseEntity.ok(ApiResponse.ok("Message envoyé", service.reply(missionId, req, operatorName)));
    }

    @PostMapping("/mission/{missionId}/read")
    @Operation(summary = "Marquer les messages du chauffeur comme lus")
    public ResponseEntity<ApiResponse<Void>> markRead(@PathVariable String missionId) {
        service.markRead(missionId);
        return ResponseEntity.ok(ApiResponse.ok("Messages marqués comme lus", null));
    }
}
