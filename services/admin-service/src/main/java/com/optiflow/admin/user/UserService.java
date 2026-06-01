package com.optiflow.admin.user;

import com.optiflow.admin.audit.AuditLogService;
import com.optiflow.admin.user.dto.CreateUserRequest;
import com.optiflow.admin.user.dto.ResetPasswordRequest;
import com.optiflow.admin.user.dto.UpdateUserRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final KeycloakAdminClient keycloakClient;
    private final AuditLogService auditLogService;

    public List<Map<String, Object>> getUsers(String role, int page, int size) {
        return keycloakClient.getUsers(role, page * size, size);
    }

    public Map<String, Object> getUser(String userId) {
        Map<String, Object> user = keycloakClient.getUserById(userId);
        if (user == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable");
        List<Map<String, Object>> roles = keycloakClient.getUserRoles(userId);
        user.put("realmRoles", roles.stream().map(r -> r.get("name")).toList());
        return user;
    }

    public Map<String, Object> createUser(CreateUserRequest req) {
        Map<String, Object> userRep = new HashMap<>();
        userRep.put("username", req.getUsername());
        userRep.put("email", req.getEmail());
        userRep.put("firstName", req.getFirstName());
        userRep.put("lastName", req.getLastName());
        userRep.put("enabled", true);
        userRep.put("emailVerified", true);
        userRep.put("credentials", List.of(
            Map.of("type", "password", "value", req.getPassword(), "temporary", false)
        ));

        Map<String, List<String>> attributes = new HashMap<>();
        if (req.getClientCode() != null) attributes.put("clientCode", List.of(req.getClientCode()));
        if (req.getPhone() != null)      attributes.put("phone",       List.of(req.getPhone()));
        if (req.getCompany() != null)    attributes.put("company",     List.of(req.getCompany()));
        if (!attributes.isEmpty())       userRep.put("attributes", attributes);

        String userId = keycloakClient.createUser(userRep);
        keycloakClient.assignRole(userId, req.getRole().name());

        auditLogService.record("USER_CREATED", "USER", userId, "admin", "ADMIN",
            "Compte créé: " + req.getUsername() + " (" + req.getRole().name() + ")");
        log.info("User created: {} with role {}", req.getUsername(), req.getRole());
        return keycloakClient.getUserById(userId);
    }

    public Map<String, Object> updateUser(String userId, UpdateUserRequest req) {
        Map<String, Object> updates = new HashMap<>();
        if (req.getFirstName() != null) updates.put("firstName", req.getFirstName());
        if (req.getLastName()  != null) updates.put("lastName",  req.getLastName());
        if (req.getEmail()     != null) updates.put("email",     req.getEmail());
        if (req.getEnabled()   != null) updates.put("enabled",   req.getEnabled());

        if (!updates.isEmpty()) {
            keycloakClient.updateUser(userId, updates);
        }

        if (req.getRoles() != null && !req.getRoles().isEmpty()) {
            keycloakClient.removeAllRealmRoles(userId);
            for (String role : req.getRoles()) {
                keycloakClient.assignRole(userId, role);
            }
        }

        auditLogService.record("USER_UPDATED", "USER", userId, "admin", "ADMIN",
            "Compte modifié");
        log.info("User {} updated", userId);
        return keycloakClient.getUserById(userId);
    }

    public void resetPassword(String userId, ResetPasswordRequest req) {
        keycloakClient.resetPassword(userId, req.getNewPassword());
        log.info("Password reset for user {}", userId);
    }

    public void sendResetPasswordEmail(String userId) {
        keycloakClient.sendResetPasswordEmail(userId);
        log.info("Reset email sent for user {}", userId);
    }

    public void disableUser(String userId) {
        keycloakClient.updateUser(userId, Map.of("enabled", false));
        auditLogService.record("USER_DISABLED", "USER", userId, "admin", "ADMIN", "Compte désactivé");
        log.info("User {} disabled", userId);
    }

    public void enableUser(String userId) {
        keycloakClient.updateUser(userId, Map.of("enabled", true));
        auditLogService.record("USER_ENABLED", "USER", userId, "admin", "ADMIN", "Compte activé");
        log.info("User {} enabled", userId);
    }

    public long countUsers() {
        return keycloakClient.countUsers();
    }
}
