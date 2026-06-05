package com.optiflow.operateur.tournee;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.operateur.kafka.EventProducer;
import com.optiflow.operateur.order.Order;
import com.optiflow.operateur.order.OrderRepository;
import com.optiflow.operateur.order.OrderStatus;
import com.optiflow.operateur.tournee.dto.AssignChauffeurRequest;
import com.optiflow.operateur.tournee.dto.CreateTourneeRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.Year;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TourneeService {

    private final TourneeRepository tourneeRepository;
    private final OrderRepository orderRepository;
    private final EventProducer eventProducer;
    private final ObjectMapper objectMapper;

    public Page<Tournee> getTournees(TourneeStatus status, Pageable pageable) {
        if (status != null) return tourneeRepository.findByStatus(status, pageable);
        return tourneeRepository.findAll(pageable);
    }

    public Tournee getTournee(UUID id) {
        return tourneeRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tournée introuvable"));
    }

    public Map<String, Long> getStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        Map<String, Long> stats = new HashMap<>();
        stats.put("pendingValidation", tourneeRepository.countByStatus(TourneeStatus.PENDING_RESPONSABLE_VALIDATION));
        stats.put("validated",         tourneeRepository.countByStatus(TourneeStatus.VALIDATED));
        stats.put("inProgress",        tourneeRepository.countByStatus(TourneeStatus.IN_PROGRESS));
        stats.put("completed",         tourneeRepository.countByStatus(TourneeStatus.COMPLETED));
        stats.put("draft",             tourneeRepository.countByStatus(TourneeStatus.DRAFT));
        stats.put("assigned",          tourneeRepository.countByStatus(TourneeStatus.ASSIGNED));
        stats.put("validatedToday",    tourneeRepository.countValidatedBetween(startOfDay, endOfDay));
        stats.put("total",             tourneeRepository.count());
        return stats;
    }

    public Tournee create(CreateTourneeRequest request, String operatorId) throws Exception {
        List<Order> orders = validateOrdersForTournee(request.getOrderIds());

        String orderIdsJson = objectMapper.writeValueAsString(
            orders.stream().map(o -> o.getId().toString()).toList()
        );

        TourneeStatus status = request.getChauffeurId() != null
            ? TourneeStatus.ASSIGNED : TourneeStatus.DRAFT;

        Tournee tournee = Tournee.builder()
            .tourneeNumber(generateTourneeNumber())
            .status(status)
            .chauffeurId(request.getChauffeurId())
            .chauffeurName(request.getChauffeurName())
            .plannedDate(request.getPlannedDate())
            .orderIdsJson(orderIdsJson)
            .operatorId(operatorId)
            .operatorNotes(request.getNotes())
            .build();

        Tournee saved = tourneeRepository.save(tournee);

        orders.forEach(order -> {
            order.setTourneeId(saved.getId());
            order.setStatus(OrderStatus.PLANNED);
            orderRepository.save(order);
        });

        eventProducer.publishTourneeCreated(saved);
        log.info("Tournée {} créée avec {} commandes", saved.getTourneeNumber(), orders.size());
        return saved;
    }

    public Tournee assignChauffeur(UUID id, AssignChauffeurRequest request) {
        Tournee tournee = getTournee(id);
        if (tournee.getStatus() == TourneeStatus.VALIDATED ||
            tournee.getStatus() == TourneeStatus.IN_PROGRESS ||
            tournee.getStatus() == TourneeStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Impossible de modifier une tournée en cours");
        }
        tournee.setChauffeurId(request.getChauffeurId());
        tournee.setChauffeurName(request.getChauffeurName());
        tournee.setStatus(TourneeStatus.ASSIGNED);
        return tourneeRepository.save(tournee);
    }

    public Tournee submitForValidation(UUID id) {
        Tournee tournee = getTournee(id);
        if (tournee.getStatus() != TourneeStatus.ASSIGNED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "La tournée doit être assignée à un chauffeur avant soumission");
        }
        tournee.setStatus(TourneeStatus.PENDING_RESPONSABLE_VALIDATION);
        Tournee saved = tourneeRepository.save(tournee);
        eventProducer.publishTourneeCreated(saved);
        return saved;
    }

    private List<Order> validateOrdersForTournee(List<UUID> orderIds) {
        if (orderIds == null || orderIds.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Au moins une commande est requise");
        List<Order> orders = orderRepository.findAllById(orderIds);
        if (orders.size() != orderIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Certaines commandes n'existent pas");
        }
        List<Order> invalidOrders = orders.stream()
            .filter(o -> o.getStatus() != OrderStatus.VALIDATED || o.getTourneeId() != null)
            .toList();
        if (!invalidOrders.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Certaines commandes ne sont pas dans l'état VALIDATED ou sont déjà dans une tournée");
        }
        return orders;
    }

    private String generateTourneeNumber() {
        int year = Year.now().getValue();
        String prefix = "TRN-" + year;
        long count = tourneeRepository.countByTourneeNumberPrefix(prefix);
        return String.format("%s-%06d", prefix, count + 1);
    }
}
