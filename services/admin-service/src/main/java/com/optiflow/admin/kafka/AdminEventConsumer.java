package com.optiflow.admin.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.admin.audit.AuditLogService;
import com.optiflow.admin.stats.SystemStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminEventConsumer {

    private final SystemStatsRepository statsRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "commandes.created", groupId = "${spring.kafka.consumer.group-id}")
    public void onCommandeCreated(@Payload String payload,
                                   @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            String orderId  = node.path("orderId").asText(null);
            String clientId = node.path("clientId").asText(null);

            statsRepository.incrementOrdersPending(1);
            auditLogService.record("ORDER_CREATED", "ORDER", orderId, clientId, "CLIENT", payload);
            log.debug("Stats updated: ORDER_CREATED orderId={}", orderId);
        } catch (Exception e) {
            log.error("Error processing {}: {}", topic, e.getMessage());
        }
    }

    @KafkaListener(topics = "commandes.validated", groupId = "${spring.kafka.consumer.group-id}")
    public void onCommandeValidated(@Payload String payload,
                                     @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            String orderId     = node.path("orderId").asText(null);
            String operateurId = node.path("operateurId").asText(null);

            statsRepository.onOrderValidated();
            auditLogService.record("ORDER_VALIDATED", "ORDER", orderId, operateurId, "OPERATEUR", payload);
        } catch (Exception e) {
            log.error("Error processing {}: {}", topic, e.getMessage());
        }
    }

    @KafkaListener(topics = "commandes.rejected", groupId = "${spring.kafka.consumer.group-id}")
    public void onCommandeRejected(@Payload String payload,
                                    @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            String orderId     = node.path("orderId").asText(null);
            String operateurId = node.path("operateurId").asText(null);

            statsRepository.onOrderRejected();
            auditLogService.record("ORDER_REJECTED", "ORDER", orderId, operateurId, "OPERATEUR", payload);
        } catch (Exception e) {
            log.error("Error processing {}: {}", topic, e.getMessage());
        }
    }

    @KafkaListener(topics = "incident.created", groupId = "${spring.kafka.consumer.group-id}")
    public void onIncidentCreated(@Payload String payload,
                                   @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode node       = objectMapper.readTree(payload);
            String incidentId   = node.path("incidentId").asText(null);
            String clientId     = node.path("clientId").asText(null);

            statsRepository.incrementIncidentsOpen();
            auditLogService.record("INCIDENT_CREATED", "INCIDENT", incidentId, clientId, "CLIENT", payload);
        } catch (Exception e) {
            log.error("Error processing {}: {}", topic, e.getMessage());
        }
    }

    @KafkaListener(topics = "incident.resolved", groupId = "${spring.kafka.consumer.group-id}")
    public void onIncidentResolved(@Payload String payload,
                                    @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode node       = objectMapper.readTree(payload);
            String incidentId   = node.path("incidentId").asText(null);
            String operateurId  = node.path("operateurId").asText(null);

            statsRepository.onIncidentResolved();
            auditLogService.record("INCIDENT_RESOLVED", "INCIDENT", incidentId, operateurId, "OPERATEUR", payload);
        } catch (Exception e) {
            log.error("Error processing {}: {}", topic, e.getMessage());
        }
    }

    @KafkaListener(topics = "tournee.created", groupId = "${spring.kafka.consumer.group-id}")
    public void onTourneeCreated(@Payload String payload,
                                  @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode node      = objectMapper.readTree(payload);
            String tourneeId   = node.path("tourneeId").asText(null);
            String responsableId = node.path("responsableId").asText(null);

            statsRepository.incrementTourneesPending();
            auditLogService.record("TOURNEE_CREATED", "TOURNEE", tourneeId, responsableId, "RESPONSABLE", payload);
        } catch (Exception e) {
            log.error("Error processing {}: {}", topic, e.getMessage());
        }
    }

    @KafkaListener(topics = "tournee.validated", groupId = "${spring.kafka.consumer.group-id}")
    public void onTourneeValidated(@Payload String payload,
                                    @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode node       = objectMapper.readTree(payload);
            String tourneeId    = node.path("tourneeId").asText(null);
            String responsableId = node.path("responsableId").asText(null);

            statsRepository.onTourneeValidated();
            auditLogService.record("TOURNEE_VALIDATED", "TOURNEE", tourneeId, responsableId, "RESPONSABLE", payload);
        } catch (Exception e) {
            log.error("Error processing {}: {}", topic, e.getMessage());
        }
    }
}
