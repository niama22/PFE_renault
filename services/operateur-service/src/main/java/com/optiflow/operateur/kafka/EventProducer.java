package com.optiflow.operateur.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.operateur.incident.Incident;
import com.optiflow.operateur.order.Order;
import com.optiflow.operateur.tournee.Tournee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void publishOrderValidated(Order order) {
        Map<String, Object> event = new HashMap<>();
        event.put("orderId", order.getId().toString());
        event.put("orderNumber", order.getOrderNumber());
        event.put("estimatedArrivalDate", order.getEstimatedArrivalDate() != null
            ? order.getEstimatedArrivalDate().toString() : null);
        event.put("operatorNotes", order.getOperatorNotes());
        publish("commandes.validated", event);
    }

    public void publishOrderRejected(Order order) {
        Map<String, Object> event = new HashMap<>();
        event.put("orderId", order.getId().toString());
        event.put("reason", order.getRejectionReason());
        publish("commandes.rejected", event);
    }

    public void publishTourneeCreated(Tournee tournee) {
        Map<String, Object> event = new HashMap<>();
        event.put("tourneeId", tournee.getId().toString());
        event.put("tourneeNumber", tournee.getTourneeNumber());
        event.put("chauffeurId", tournee.getChauffeurId());
        event.put("plannedDate", tournee.getPlannedDate() != null ? tournee.getPlannedDate().toString() : null);
        publish("tournee.created", event);
    }

    public void publishTourneeValidated(Tournee tournee) {
        Map<String, Object> event = new HashMap<>();
        event.put("tourneeId", tournee.getId().toString());
        event.put("tourneeNumber", tournee.getTourneeNumber());
        event.put("chauffeurId", tournee.getChauffeurId());
        publish("tournee.validated", event);
    }

    public void publishIncidentResolved(Incident incident) {
        Map<String, Object> event = new HashMap<>();
        event.put("incidentId", incident.getId().toString());
        event.put("clientId", incident.getClientId());
        event.put("orderId", incident.getOrderId() != null ? incident.getOrderId().toString() : null);
        event.put("operatorResponse", incident.getOperatorResponse());
        publish("incident.resolved", event);
    }

    public void publishIncidentClosed(Incident incident) {
        Map<String, Object> event = new HashMap<>();
        event.put("incidentId", incident.getId().toString());
        event.put("clientId", incident.getClientId());
        publish("incident.closed", event);
    }

    public void publishIncidentInProgress(Incident incident) {
        Map<String, Object> event = new HashMap<>();
        event.put("incidentId", incident.getId().toString());
        event.put("clientId", incident.getClientId());
        publish("incident.in_progress", event);
    }

    public void publishOrderInTransit(String orderId, String tourneeNumber) {
        Map<String, Object> event = new HashMap<>();
        event.put("orderId", orderId);
        event.put("tourneeNumber", tourneeNumber);
        publish("commandes.in_transit", event);
    }

    public void publishOrderDelivered(String orderId, String tourneeNumber) {
        Map<String, Object> event = new HashMap<>();
        event.put("orderId", orderId);
        event.put("tourneeNumber", tourneeNumber);
        publish("commandes.delivered", event);
    }

    public void publishCancellationPending(com.optiflow.operateur.cancellation.CancellationRequest req) {
        Map<String, Object> event = new HashMap<>();
        event.put("cancellationId", req.getId().toString());
        event.put("orderId", req.getOrderId().toString());
        event.put("orderNumber", req.getOrderNumber());
        event.put("clientId", req.getClientId());
        event.put("clientCode", req.getClientCode());
        event.put("clientName", req.getClientName());
        event.put("clientCompany", req.getClientCompany());
        event.put("deliveryAddressJson", req.getDeliveryAddressJson());
        event.put("allVehiclesJson", req.getAllVehiclesJson());
        event.put("requestedVehiclesJson", req.getRequestedVehiclesJson());
        event.put("reason", req.getReason());
        event.put("operateurId", req.getOperateurId());
        publish("commandes.cancellation_pending", event);
    }

    public void publishOrderCancellationRequested(String orderId) {
        Map<String, Object> event = new HashMap<>();
        event.put("orderId", orderId);
        publish("commandes.cancellation_requested", event);
    }

    public void publishOrderCancelled(String orderId) {
        Map<String, Object> event = new HashMap<>();
        event.put("orderId", orderId);
        publish("commandes.cancelled", event);
    }

    public void publishOrderCancellationRejected(String orderId) {
        Map<String, Object> event = new HashMap<>();
        event.put("orderId", orderId);
        publish("commandes.cancellation_rejected", event);
    }

    private void publish(String topic, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(topic, json);
            log.info("Published to {}: {}", topic, json);
        } catch (Exception e) {
            log.error("Failed to publish to {}: {}", topic, e.getMessage());
        }
    }
}
