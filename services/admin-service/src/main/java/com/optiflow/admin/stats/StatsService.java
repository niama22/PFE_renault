package com.optiflow.admin.stats;

import com.optiflow.admin.user.UserService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StatsService {

    private final SystemStatsRepository statsRepository;
    private final UserService userService;

    @Transactional
    public SystemStats getStats() {
        return statsRepository.findById(1L).orElseGet(() -> {
            SystemStats stats = new SystemStats();
            return statsRepository.save(stats);
        });
    }

    public Map<String, Object> getDashboard() {
        SystemStats stats = getStats();
        Map<String, Object> dashboard = new HashMap<>();

        Map<String, Long> orders = new HashMap<>();
        orders.put("pending",    stats.getOrdersPending());
        orders.put("validated",  stats.getOrdersValidated());
        orders.put("rejected",   stats.getOrdersRejected());
        orders.put("planned",    stats.getOrdersPlanned());
        orders.put("inTransit",  stats.getOrdersInTransit());
        orders.put("delivered",  stats.getOrdersDelivered());
        orders.put("total",      stats.getOrdersPending() + stats.getOrdersValidated()
                                 + stats.getOrdersRejected() + stats.getOrdersPlanned()
                                 + stats.getOrdersInTransit() + stats.getOrdersDelivered());

        Map<String, Long> incidents = new HashMap<>();
        incidents.put("open",       stats.getIncidentsOpen());
        incidents.put("inProgress", stats.getIncidentsInProgress());
        incidents.put("resolved",   stats.getIncidentsResolved());
        incidents.put("total",      stats.getIncidentsOpen() + stats.getIncidentsInProgress() + stats.getIncidentsResolved());

        Map<String, Long> tournees = new HashMap<>();
        tournees.put("pendingValidation", stats.getTourneesPendingValidation());
        tournees.put("validated",         stats.getTourneesValidated());
        tournees.put("inProgress",        stats.getTourneesInProgress());
        tournees.put("completed",         stats.getTourneesCompleted());

        dashboard.put("orders",    orders);
        dashboard.put("incidents", incidents);
        dashboard.put("tournees",  tournees);
        dashboard.put("updatedAt", stats.getUpdatedAt());

        try {
            dashboard.put("totalUsers", userService.countUsers());
        } catch (Exception e) {
            log.warn("Could not fetch user count: {}", e.getMessage());
            dashboard.put("totalUsers", 0);
        }

        return dashboard;
    }

    @PostConstruct
    @Transactional
    public void ensureStatsExist() {
        if (!statsRepository.existsById(1L)) {
            statsRepository.save(new SystemStats());
        }
    }
}
