package com.optiflow.admin.user;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class KeycloakAdminClient {

    private final WebClient webClient;
    private final String realm;
    private final String adminClientId;
    private final String adminUsername;
    private final String adminPassword;
    private final String keycloakUrl;

    public KeycloakAdminClient(
            WebClient.Builder builder,
            @Value("${keycloak.internal-url}") String keycloakUrl,
            @Value("${keycloak.realm}") String realm,
            @Value("${keycloak.admin-client-id}") String adminClientId,
            @Value("${keycloak.admin-username}") String adminUsername,
            @Value("${keycloak.admin-password}") String adminPassword) {
        this.keycloakUrl = keycloakUrl;
        this.realm = realm;
        this.adminClientId = adminClientId;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.webClient = builder.baseUrl(keycloakUrl).build();
    }

    private String getAdminToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", adminClientId);
        form.add("username", adminUsername);
        form.add("password", adminPassword);
        form.add("grant_type", "password");

        Map<?, ?> response = webClient.post()
            .uri("/realms/master/protocol/openid-connect/token")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(form))
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        return (String) response.get("access_token");
    }

    public List<Map<String, Object>> getUsers(String role, int first, int max) {
        String token = getAdminToken();
        String uri = role != null
            ? "/admin/realms/" + realm + "/roles/" + role.toLowerCase() + "/users?first=" + first + "&max=" + max
            : "/admin/realms/" + realm + "/users?first=" + first + "&max=" + max;

        return webClient.get()
            .uri(uri)
            .header("Authorization", "Bearer " + token)
            .retrieve()
            .bodyToFlux(Map.class)
            .map(m -> (Map<String, Object>) m)
            .collectList()
            .block();
    }

    public Map<String, Object> getUserById(String userId) {
        String token = getAdminToken();
        return webClient.get()
            .uri("/admin/realms/" + realm + "/users/" + userId)
            .header("Authorization", "Bearer " + token)
            .retrieve()
            .bodyToMono(Map.class)
            .map(m -> (Map<String, Object>) m)
            .block();
    }

    public String createUser(Map<String, Object> userRepresentation) {
        String token = getAdminToken();
        try {
            var response = webClient.post()
                .uri("/admin/realms/" + realm + "/users")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(userRepresentation)
                .retrieve()
                .onStatus(status -> status.value() == 409,
                    r -> Mono.error(new ResponseStatusException(HttpStatus.CONFLICT, "Nom d'utilisateur ou email deja utilise")))
                .onStatus(status -> status.is4xxClientError(),
                    r -> r.bodyToMono(String.class).flatMap(body ->
                        Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Donnees invalides: " + body))))
                .toBodilessEntity()
                .block();

            if (response == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Pas de reponse de Keycloak");
            }

            String location = response.getHeaders().getFirst("Location");
            if (location == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Location header manquant dans la reponse Keycloak");
            }
            return location.substring(location.lastIndexOf('/') + 1);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur creation user Keycloak: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Echec creation utilisateur: " + e.getMessage());
        }
    }

    public void updateUser(String userId, Map<String, Object> updates) {
        String token = getAdminToken();
        webClient.put()
            .uri("/admin/realms/" + realm + "/users/" + userId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(updates)
            .retrieve()
            .toBodilessEntity()
            .block();
    }

    public void resetPassword(String userId, String newPassword) {
        String token = getAdminToken();
        Map<String, Object> credential = Map.of(
            "type", "password",
            "value", newPassword,
            "temporary", false
        );
        webClient.put()
            .uri("/admin/realms/" + realm + "/users/" + userId + "/reset-password")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(credential)
            .retrieve()
            .toBodilessEntity()
            .block();
    }

    public void assignRole(String userId, String roleName) {
        String token = getAdminToken();
        Map<String, Object> role = getRoleByName(roleName, token);
        webClient.post()
            .uri("/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(List.of(role))
            .retrieve()
            .toBodilessEntity()
            .block();
    }

    public List<Map<String, Object>> getUserRoles(String userId) {
        String token = getAdminToken();
        return webClient.get()
            .uri("/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm")
            .header("Authorization", "Bearer " + token)
            .retrieve()
            .bodyToFlux(Map.class)
            .map(m -> (Map<String, Object>) m)
            .collectList()
            .block();
    }

    private Map<String, Object> getRoleByName(String roleName, String token) {
        return webClient.get()
            .uri("/admin/realms/" + realm + "/roles/" + roleName.toLowerCase())
            .header("Authorization", "Bearer " + token)
            .retrieve()
            .bodyToMono(Map.class)
            .map(m -> (Map<String, Object>) m)
            .block();
    }

    public void removeAllRealmRoles(String userId) {
        String token = getAdminToken();
        List<Map<String, Object>> roles = getUserRoles(userId);
        if (roles == null || roles.isEmpty()) return;
        webClient.method(org.springframework.http.HttpMethod.DELETE)
            .uri("/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(roles)
            .retrieve()
            .toBodilessEntity()
            .block();
    }

    public void sendResetPasswordEmail(String userId) {
        String token = getAdminToken();
        webClient.put()
            .uri("/admin/realms/" + realm + "/users/" + userId + "/execute-actions-email")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(List.of("UPDATE_PASSWORD"))
            .retrieve()
            .toBodilessEntity()
            .block();
    }

    public long countUsers() {
        String token = getAdminToken();
        Integer count = webClient.get()
            .uri("/admin/realms/" + realm + "/users/count")
            .header("Authorization", "Bearer " + token)
            .retrieve()
            .bodyToMono(Integer.class)
            .block();
        return count != null ? count : 0;
    }
}
