package com.optiflow.responsable.cancellation;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CancellationService {

    private final CancellationRecordRepository repository;
    private final PdfGeneratorService pdfService;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public List<CancellationRecord> getAll() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    public List<CancellationRecord> getPending() {
        return repository.findByStatus(CancellationStatus.PENDING_RESPONSABLE);
    }

    public CancellationRecord getById(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));
    }

    public CancellationRecord createFromEvent(Map<String, Object> data) {
        UUID id = UUID.fromString(data.get("cancellationId").toString());
        if (repository.existsById(id)) return repository.findById(id).get();

        CancellationRecord record = CancellationRecord.builder()
            .id(id)
            .orderId(UUID.fromString(data.get("orderId").toString()))
            .orderNumber(str(data, "orderNumber"))
            .clientId(str(data, "clientId"))
            .clientCode(str(data, "clientCode"))
            .clientName(str(data, "clientName"))
            .clientCompany(str(data, "clientCompany"))
            .deliveryAddressJson(str(data, "deliveryAddressJson"))
            .allVehiclesJson(str(data, "allVehiclesJson"))
            .requestedVehiclesJson(str(data, "requestedVehiclesJson"))
            .reason(str(data, "reason"))
            .operateurId(str(data, "operateurId"))
            .status(CancellationStatus.PENDING_RESPONSABLE)
            .build();

        return repository.save(record);
    }

    public CancellationRecord approve(UUID id, String responsableId) {
        CancellationRecord record = getById(id);
        if (record.getStatus() != CancellationStatus.PENDING_RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette demande a déjà été traitée");
        }

        record.setResponsableId(responsableId);
        record.setStatus(CancellationStatus.APPROVED);

        // Generate PDF
        byte[] pdf = pdfService.generateCancellationDocument(record);
        record.setDocumentData(pdf);

        CancellationRecord saved = repository.save(record);

        // Publish to operateur-service
        publish("commandes.cancellation_approved", Map.of(
            "cancellationId", id.toString(),
            "orderId", saved.getOrderId().toString(),
            "responsableId", responsableId,
            "documentData", Base64.getEncoder().encodeToString(pdf)
        ));

        log.info("Cancellation {} APPROVED by {}", id, responsableId);
        return saved;
    }

    public CancellationRecord reject(UUID id, String responsableId, String reason) {
        CancellationRecord record = getById(id);
        if (record.getStatus() != CancellationStatus.PENDING_RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette demande a déjà été traitée");
        }

        record.setResponsableId(responsableId);
        record.setStatus(CancellationStatus.REJECTED);
        record.setRejectionReason(reason);

        CancellationRecord saved = repository.save(record);

        publish("commandes.cancellation_rejected_by_respo", Map.of(
            "cancellationId", id.toString(),
            "orderId", saved.getOrderId().toString(),
            "responsableId", responsableId,
            "reason", reason != null ? reason : ""
        ));

        log.info("Cancellation {} REJECTED by {}: {}", id, responsableId, reason);
        return saved;
    }

    public byte[] getDocument(UUID id) {
        CancellationRecord record = getById(id);
        if (record.getDocumentData() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document non disponible");
        }
        return record.getDocumentData();
    }

    private void publish(String topic, Map<String, Object> payload) {
        try {
            kafkaTemplate.send(topic, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to publish to {}: {}", topic, e.getMessage());
        }
    }

    private String str(Map<String, Object> data, String key) {
        Object val = data.get(key);
        return val != null ? val.toString() : null;
    }
}
