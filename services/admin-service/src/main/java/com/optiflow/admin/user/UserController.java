package com.optiflow.admin.user;

import com.optiflow.admin.common.ApiResponse;
import com.optiflow.admin.user.dto.CreateUserRequest;
import com.optiflow.admin.user.dto.ResetPasswordRequest;
import com.optiflow.admin.user.dto.UpdateUserRequest;
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
import java.util.Map;

@Tag(name = "Utilisateurs", description = "Gestion des comptes utilisateurs via Keycloak")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lister les utilisateurs (filtre par role possible)")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUsers(role, page, size)));
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Détail d'un utilisateur")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUser(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUser(userId)));
    }

    @PostMapping
    @Operation(summary = "Créer un utilisateur avec un rôle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createUser(
            @RequestBody @Valid CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Utilisateur cree", userService.createUser(request)));
    }

    @PutMapping("/{userId}")
    @Operation(summary = "Modifier un utilisateur")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(
            @PathVariable String userId,
            @RequestBody @Valid UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Utilisateur modifie", userService.updateUser(userId, request)));
    }

    @PostMapping("/{userId}/reset-password")
    @Operation(summary = "Réinitialiser le mot de passe")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable String userId,
            @RequestBody @Valid ResetPasswordRequest request) {
        userService.resetPassword(userId, request);
        return ResponseEntity.ok(ApiResponse.ok("Mot de passe reinitialise", null));
    }

    @PatchMapping("/{userId}/disable")
    @Operation(summary = "Désactiver un compte")
    public ResponseEntity<ApiResponse<Void>> disable(@PathVariable String userId) {
        userService.disableUser(userId);
        return ResponseEntity.ok(ApiResponse.ok("Compte desactive", null));
    }

    @PatchMapping("/{userId}/enable")
    @Operation(summary = "Activer un compte")
    public ResponseEntity<ApiResponse<Void>> enable(@PathVariable String userId) {
        userService.enableUser(userId);
        return ResponseEntity.ok(ApiResponse.ok("Compte active", null));
    }

    @PostMapping("/{userId}/send-reset-email")
    @Operation(summary = "Envoyer email de réinitialisation du mot de passe")
    public ResponseEntity<ApiResponse<Void>> sendResetEmail(@PathVariable String userId) {
        userService.sendResetPasswordEmail(userId);
        return ResponseEntity.ok(ApiResponse.ok("Email de reinitialisation envoye", null));
    }

    @GetMapping("/by-role/{role}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESPONSABLE', 'OPERATEUR')")
    @Operation(summary = "Lister les utilisateurs par rôle (accessible par opérateur/responsable)")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUsersByRole(
            @PathVariable String role) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUsers(role, 0, 100)));
    }
}
