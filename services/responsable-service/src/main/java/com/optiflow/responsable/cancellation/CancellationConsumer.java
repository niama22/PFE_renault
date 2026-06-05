package com.optiflow.responsable.cancellation;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CancellationConsumer {

    private final CancellationService cancellationService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "commandes.cancellation_pending", groupId = "responsable-service-group")
    public void onCancellationPending(String message) {
        try {
            Map<String, Object> data = objectMapper.readValue(message,
                objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
            CancellationRecord record = cancellationService.createFromEvent(data);
            log.info("CancellationRecord {} received for order {}", record.getId(), record.getOrderId());
        } catch (Exception e) {
            log.error("Error processing commandes.cancellation_pending: {}", e.getMessage());
        }
    }
}
