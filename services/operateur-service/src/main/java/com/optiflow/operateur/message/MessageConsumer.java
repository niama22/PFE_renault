package com.optiflow.operateur.message;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class MessageConsumer {

    private final MessageService service;
    private final ObjectMapper mapper;

    @KafkaListener(topics = "message.sent", groupId = "operateur-messages-group")
    public void onChauffeurMessage(String payload) {
        try {
            Map<String, Object> data = mapper.readValue(payload, new TypeReference<>() {});
            service.saveChauffeurMessage(data);
        } catch (Exception e) {
            log.error("Failed to process chauffeur message: {}", e.getMessage());
        }
    }
}
