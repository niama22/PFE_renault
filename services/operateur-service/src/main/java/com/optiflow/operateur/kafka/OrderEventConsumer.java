package com.optiflow.operateur.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.operateur.incident.Incident;
import com.optiflow.operateur.incident.IncidentRepository;
import com.optiflow.operateur.incident.IncidentStatus;
import com.optiflow.operateur.order.Order;
import com.optiflow.operateur.order.OrderRepository;
import com.optiflow.operateur.order.OrderStatus;
import com.optiflow.operateur.tournee.Tournee;
import com.optiflow.operateur.tournee.TourneeRepository;
import com.optiflow.operateur.tournee.TourneeStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


@Slf4j
@Service
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final OrderRepository orderRepository;
    private final IncidentRepository incidentRepository;
    private final TourneeRepository tourneeRepository;
    private final EventProducer eventProducer;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "commandes.created", groupId = "operateur-service-group")
    @Transactional
    public void onOrderCreated(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            UUID orderId = UUID.fromString(node.get("orderId").asText());

            if (orderRepository.existsById(orderId)) {
                log.info("Order {} already exists, skipping", orderId);
                return;
            }

            Order order = Order.builder()
                .id(orderId)
                .clientId(node.get("clientId").asText())
                .clientCode(node.has("clientCode") ? node.get("clientCode").asText() : null)
                .vehiclesJson(node.get("vehicles").toString())
                .requestedDeliveryDate(node.has("requestedDeliveryDate")
                    ? parseDate(node.get("requestedDeliveryDate").asText()) : null)
                .deliveryAddressJson(node.has("deliveryAddress") ? node.get("deliveryAddress").toString() : null)
                .deliveryLat(node.has("deliveryLat") && !node.get("deliveryLat").isNull()
                    ? node.get("deliveryLat").asDouble() : null)
                .deliveryLng(node.has("deliveryLng") && !node.get("deliveryLng").isNull()
                    ? node.get("deliveryLng").asDouble() : null)
                .status(OrderStatus.PENDING_VALIDATION)
                .build();

            orderRepository.save(order);
            log.info("Order received from Kafka: {}", orderId);
        } catch (Exception e) {
            log.error("Error processing commandes.created: {}", e.getMessage());
        }
    }

    private LocalDate parseDate(String text) {
        if (text == null || text.isBlank()) return null;
        return LocalDate.parse(text.length() > 10 ? text.substring(0, 10) : text);
    }

    @KafkaListener(topics = "incident.created", groupId = "operateur-service-group")
    @Transactional
    public void onIncidentCreated(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            UUID incidentId = UUID.fromString(node.get("incidentId").asText());

            if (incidentRepository.existsById(incidentId)) {
                log.info("Incident {} already exists, skipping", incidentId);
                return;
            }

            Incident incident = Incident.builder()
                .id(incidentId)
                .clientId(node.get("clientId").asText())
                .clientCode(node.has("clientCode") ? node.get("clientCode").asText() : null)
                .orderId(node.has("orderId") && !node.get("orderId").isNull()
                    ? UUID.fromString(node.get("orderId").asText()) : null)
                .description(node.get("description").asText())
                .severity(node.has("severity") ? node.get("severity").asText() : "MEDIUM")
                .status(IncidentStatus.OPEN)
                .build();

            incidentRepository.save(incident);
            log.info("Incident received from Kafka: {}", incidentId);
        } catch (Exception e) {
            log.error("Error processing incident.created: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "mission.started", groupId = "operateur-service-group")
    @Transactional
    public void onMissionStarted(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            String tourneeId = node.has("tourneeId") ? node.get("tourneeId").asText() : null;
            String tourneeNumber = node.has("tourneeNumber") ? node.get("tourneeNumber").asText() : "";
            if (tourneeId == null) return;

            // Update tournée status to IN_PROGRESS
            tourneeRepository.findById(UUID.fromString(tourneeId)).ifPresent(t -> {
                t.setStatus(TourneeStatus.IN_PROGRESS);
                tourneeRepository.save(t);
            });

            // Update all orders of this tournée to IN_TRANSIT and notify client-service
            List<Order> orders = orderRepository.findByTourneeId(UUID.fromString(tourneeId));
            for (Order order : orders) {
                order.setStatus(OrderStatus.IN_TRANSIT);
                orderRepository.save(order);
                eventProducer.publishOrderInTransit(order.getId().toString(), tourneeNumber);
            }
            log.info("Mission started for tournée {}: {} order(s) → IN_TRANSIT", tourneeNumber, orders.size());
        } catch (Exception e) {
            log.error("Error processing mission.started: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "mission.completed", groupId = "operateur-service-group")
    @Transactional
    public void onMissionCompleted(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            String tourneeId = node.has("tourneeId") ? node.get("tourneeId").asText() : null;
            String tourneeNumber = node.has("tourneeNumber") ? node.get("tourneeNumber").asText() : "";
            if (tourneeId == null) return;

            // Update tournée status to COMPLETED
            tourneeRepository.findById(UUID.fromString(tourneeId)).ifPresent(t -> {
                t.setStatus(TourneeStatus.COMPLETED);
                tourneeRepository.save(t);
            });

            // Update all orders of this tournée to DELIVERED and notify client-service
            List<Order> orders = orderRepository.findByTourneeId(UUID.fromString(tourneeId));
            for (Order order : orders) {
                order.setStatus(OrderStatus.DELIVERED);
                orderRepository.save(order);
                eventProducer.publishOrderDelivered(order.getId().toString(), tourneeNumber);
            }
            log.info("Mission completed for tournée {}: {} order(s) → DELIVERED", tourneeNumber, orders.size());
        } catch (Exception e) {
            log.error("Error processing mission.completed: {}", e.getMessage());
        }
    }
}
