package com.optiflow.operateur.message;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private final OperateurMessageRepository repo;
    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper mapper;

    public List<OperateurMessage> getThread(String missionId) {
        return repo.findByMissionIdOrderByCreatedAtAsc(missionId);
    }

    public List<OperateurMessage> getThreads() {
        return repo.findLatestPerMission();
    }

    public long countUnread(String missionId) {
        return repo.countByMissionIdAndSenderAndReadAtIsNull(missionId, MessageSender.CHAUFFEUR);
    }

    public OperateurMessage reply(String missionId, ReplyRequest req, String operatorName) {

        OperateurMessage msg = OperateurMessage.builder()
                .missionId(missionId)
                .chauffeurId(req.getChauffeurId())
                .sender(MessageSender.OPERATEUR)
                .senderName(operatorName)
                .content(req.getContent())
                .build();
        OperateurMessage saved = repo.save(msg);

        try {
            String payload = mapper.writeValueAsString(Map.of(
                    "missionId",    missionId,
                    "chauffeurId",  req.getChauffeurId(),
                    "operatorName", operatorName,
                    "content",      req.getContent(),
                    "createdAt",    saved.getCreatedAt().toString()
            ));
            kafka.send("message.operator_reply", payload);
        } catch (Exception e) {
            log.error("Failed to publish operator reply", e);
        }

        return saved;
    }

    public void markRead(String missionId) {
        List<OperateurMessage> unread = repo.findByMissionIdOrderByCreatedAtAsc(missionId)
                .stream()
                .filter(m -> m.getSender() == MessageSender.CHAUFFEUR && m.getReadAt() == null)
                .toList();
        unread.forEach(m -> m.setReadAt(Instant.now()));
        repo.saveAll(unread);
    }

    public void saveChauffeurMessage(Map<String, Object> payload) {
        try {
            OperateurMessage msg = OperateurMessage.builder()
                    .missionId((String) payload.get("missionId"))
                    .chauffeurId((String) payload.get("chauffeurId"))
                    .chauffeurName((String) payload.getOrDefault("chauffeurName", "Chauffeur"))
                    .sender(MessageSender.CHAUFFEUR)
                    .senderName((String) payload.getOrDefault("chauffeurName", "Chauffeur"))
                    .content((String) payload.get("content"))
                    .build();
            repo.save(msg);
            log.info("Chauffeur message saved for mission {}", msg.getMissionId());
        } catch (Exception e) {
            log.error("Failed to save chauffeur message", e);
        }
    }
}
