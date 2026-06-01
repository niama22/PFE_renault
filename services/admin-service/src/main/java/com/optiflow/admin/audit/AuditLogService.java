package com.optiflow.admin.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repository;

    @Async
    @Transactional
    public void record(String eventType, String entityType, String entityId,
                       String actorId, String actorRole, String details) {
        AuditLog entry = AuditLog.builder()
            .eventType(eventType)
            .entityType(entityType)
            .entityId(entityId)
            .actorId(actorId)
            .actorRole(actorRole)
            .details(details)
            .build();
        repository.save(entry);
        log.debug("Audit recorded: {} on {}/{}", eventType, entityType, entityId);
    }

    public Page<AuditLog> getLogs(int page, int size) {
        return repository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    public List<AuditLog> getByEntity(String entityType, String entityId) {
        return repository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }

    public List<AuditLog> getByEventType(String eventType) {
        return repository.findByEventTypeOrderByCreatedAtDesc(eventType);
    }
}
