package com.optiflow.operateur.incident;

import com.optiflow.operateur.incident.dto.ResolveIncidentRequest;
import com.optiflow.operateur.kafka.EventProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final EventProducer eventProducer;

    public Page<Incident> getIncidents(IncidentStatus status, Pageable pageable) {
        if (status != null) return incidentRepository.findByStatus(status, pageable);
        return incidentRepository.findAll(pageable);
    }

    public Incident getIncident(UUID id) {
        return incidentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident introuvable"));
    }

    public Incident takeInProgress(UUID id, String operatorId) {
        Incident incident = getIncident(id);

        if (incident.getStatus() != IncidentStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "L'incident doit être en statut OPEN pour être pris en charge");
        }

        incident.setStatus(IncidentStatus.IN_PROGRESS);
        incident.setOperatorId(operatorId);

        Incident saved = incidentRepository.save(incident);
        eventProducer.publishIncidentInProgress(saved);
        log.info("Incident {} taken in progress by operator {}", id, operatorId);
        return saved;
    }

    public Incident resolve(UUID id, ResolveIncidentRequest request, String operatorId) {
        Incident incident = getIncident(id);

        if (incident.getStatus() == IncidentStatus.RESOLVED ||
            incident.getStatus() == IncidentStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "L'incident est déjà résolu ou fermé");
        }

        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setOperatorResponse(request.getResponse());
        incident.setOperatorId(operatorId);
        incident.setResolvedAt(LocalDateTime.now());

        Incident saved = incidentRepository.save(incident);
        eventProducer.publishIncidentResolved(saved);
        log.info("Incident {} resolved by operator {}", id, operatorId);
        return saved;
    }

    public Incident close(UUID id) {
        Incident incident = getIncident(id);

        if (incident.getStatus() != IncidentStatus.RESOLVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "L'incident doit être résolu avant d'être fermé");
        }

        incident.setStatus(IncidentStatus.CLOSED);
        Incident saved = incidentRepository.save(incident);
        eventProducer.publishIncidentClosed(saved);
        return saved;
    }
}
