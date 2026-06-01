package com.optiflow.responsable.tournee;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MissionEventConsumer {

    private final TourneeRepository tourneeRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "mission.started", groupId = "responsable-service-group")
    @Transactional
    public void onMissionStarted(String message) {
        updateTourneeStatus(message, TourneeStatus.IN_PROGRESS, "mission.started");
    }

    @KafkaListener(topics = "mission.completed", groupId = "responsable-service-group")
    @Transactional
    public void onMissionCompleted(String message) {
        updateTourneeStatus(message, TourneeStatus.COMPLETED, "mission.completed");
    }

    @KafkaListener(topics = "mission.acknowledged", groupId = "responsable-service-group")
    @Transactional
    public void onMissionAcknowledged(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            String tourneeId = node.get("tourneeId").asText();
            tourneeRepository.findById(UUID.fromString(tourneeId)).ifPresent(tournee -> {
                log.info("Mission acknowledged for tournée {}", tournee.getTourneeNumber());
            });
        } catch (Exception e) {
            log.error("Error processing mission.acknowledged: {}", e.getMessage());
        }
    }

    private void updateTourneeStatus(String message, TourneeStatus newStatus, String topic) {
        try {
            JsonNode node = objectMapper.readTree(message);
            String tourneeId = node.get("tourneeId").asText();
            tourneeRepository.findById(UUID.fromString(tourneeId)).ifPresent(tournee -> {
                if (tournee.getStatus() != newStatus) {
                    tournee.setStatus(newStatus);
                    tourneeRepository.save(tournee);
                    log.info("Tournée {} status updated to {} via {}", tournee.getTourneeNumber(), newStatus, topic);
                }
            });
        } catch (Exception e) {
            log.error("Error processing {}: {}", topic, e.getMessage());
        }
    }
}
