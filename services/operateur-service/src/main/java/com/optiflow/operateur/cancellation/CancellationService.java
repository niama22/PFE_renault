package com.optiflow.operateur.cancellation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.operateur.kafka.EventProducer;
import com.optiflow.operateur.order.Order;
import com.optiflow.operateur.order.OrderRepository;
import com.optiflow.operateur.order.OrderStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CancellationService {

    private final CancellationRepository cancellationRepository;
    private final OrderRepository orderRepository;
    private final EventProducer eventProducer;
    private final ObjectMapper objectMapper;

    public List<CancellationRequest> getAll() {
        return cancellationRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<CancellationRequest> getPending() {
        return cancellationRepository.findByStatus(CancellationStatus.PENDING_OPERATEUR);
    }

    // Called when operateur receives cancellation_requested Kafka event
    public CancellationRequest createFromEvent(Map<String, Object> data) {
        UUID orderId = UUID.fromString(data.get("orderId").toString());

        // Avoid duplicates
        if (cancellationRepository.findByOrderId(orderId).isPresent()) {
            log.info("Cancellation request for order {} already exists", orderId);
            return cancellationRepository.findByOrderId(orderId).get();
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return null;

        CancellationRequest req = CancellationRequest.builder()
            .orderId(orderId)
            .orderNumber(order.getOrderNumber())
            .clientId(data.getOrDefault("clientId", "").toString())
            .clientCode(data.getOrDefault("clientCode", "").toString())
            .clientName(data.getOrDefault("clientName", "").toString())
            .clientCompany(data.getOrDefault("clientCompany", "").toString())
            .deliveryAddressJson(order.getDeliveryAddressJson())
            .allVehiclesJson(order.getVehiclesJson())
            .requestedVehiclesJson(data.getOrDefault("requestedVehiclesJson", order.getVehiclesJson()).toString())
            .reason(data.getOrDefault("reason", "").toString())
            .status(CancellationStatus.PENDING_OPERATEUR)
            .build();

        CancellationRequest saved = cancellationRepository.save(req);

        // Update order status
        order.setStatus(OrderStatus.CANCELLATION_REQUESTED);
        orderRepository.save(order);

        log.info("CancellationRequest {} created for order {}", saved.getId(), orderId);
        return saved;
    }

    // Operateur forwards to responsable
    public CancellationRequest forwardToResponsable(UUID id, String operateurId) {
        CancellationRequest req = cancellationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));

        if (req.getStatus() != CancellationStatus.PENDING_OPERATEUR) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette demande a déjà été transmise");
        }

        req.setStatus(CancellationStatus.PENDING_RESPONSABLE);
        req.setOperateurId(operateurId);
        CancellationRequest saved = cancellationRepository.save(req);

        // Update order status
        orderRepository.findById(req.getOrderId()).ifPresent(order -> {
            order.setStatus(OrderStatus.CANCELLATION_PENDING);
            orderRepository.save(order);
        });

        // Publish to responsable
        eventProducer.publishCancellationPending(saved);
        eventProducer.publishOrderCancellationRequested(req.getOrderId().toString());

        log.info("Cancellation {} forwarded to responsable by {}", id, operateurId);
        return saved;
    }

    public byte[] getDocument(UUID id) {
        CancellationRequest req = cancellationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));
        if (req.getDocumentData() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document non disponible");
        }
        return req.getDocumentData();
    }

    public CancellationRequest getById(UUID id) {
        return cancellationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));
    }
}
