package com.optiflow.operateur.order;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.operateur.kafka.EventProducer;
import com.optiflow.operateur.order.dto.RejectOrderRequest;
import com.optiflow.operateur.order.dto.ValidateOrderRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.Year;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final EventProducer eventProducer;
    private final ObjectMapper objectMapper;

    public Page<Order> getOrders(OrderStatus status, String clientCode, Pageable pageable) {
        if (status != null && clientCode != null)
            return orderRepository.findByStatusAndClientCode(status, clientCode, pageable);
        if (status != null)
            return orderRepository.findByStatus(status, pageable);
        if (clientCode != null)
            return orderRepository.findByClientCode(clientCode, pageable);
        return orderRepository.findAll(pageable);
    }

    public Order getOrder(UUID id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commande introuvable"));
    }

    public List<Order> getValidatedUnplannedOrders() {
        return orderRepository.findByStatusAndTourneeIdIsNull(OrderStatus.VALIDATED);
    }

    public Map<String, Long> getStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        for (OrderStatus s : OrderStatus.values()) {
            stats.put(s.name(), orderRepository.countByStatus(s));
        }
        stats.put("total", orderRepository.count());
        return stats;
    }

    public Order validateOrder(UUID id, ValidateOrderRequest request) {
        Order order = getOrder(id);

        if (order.getStatus() != OrderStatus.PENDING_VALIDATION) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "La commande n'est pas en attente de validation (status: " + order.getStatus() + ")");
        }

        order.setOrderNumber(generateOrderNumber());
        order.setStatus(OrderStatus.VALIDATED);
        order.setOperatorNotes(request.getNotes());
        order.setEstimatedArrivalDate(request.getEstimatedArrivalDate());

        Order saved = orderRepository.save(order);
        eventProducer.publishOrderValidated(saved);
        log.info("Order {} validated → {}", id, saved.getOrderNumber());
        return saved;
    }

    public Order patchOrder(UUID id, Map<String, Object> fields) {
        Order order = getOrder(id);
        if (fields.containsKey("requestedDeliveryDate")) {
            String d = (String) fields.get("requestedDeliveryDate");
            order.setRequestedDeliveryDate(d != null ? LocalDate.parse(d) : null);
        }
        if (fields.containsKey("deliveryAddressJson")) {
            order.setDeliveryAddressJson((String) fields.get("deliveryAddressJson"));
        }
        if (fields.containsKey("vehiclesJson")) {
            order.setVehiclesJson((String) fields.get("vehiclesJson"));
        }
        if (fields.containsKey("operatorNotes")) {
            order.setOperatorNotes((String) fields.get("operatorNotes"));
        }
        return orderRepository.save(order);
    }

    public Order rejectOrder(UUID id, RejectOrderRequest request) {
        Order order = getOrder(id);

        if (order.getStatus() != OrderStatus.PENDING_VALIDATION) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "La commande n'est pas en attente de validation");
        }

        order.setStatus(OrderStatus.REJECTED);
        order.setRejectionReason(request.getReason());

        Order saved = orderRepository.save(order);
        eventProducer.publishOrderRejected(saved);
        log.info("Order {} rejected: {}", id, request.getReason());
        return saved;
    }

    public List<Map<String, Object>> importFromExcel(MultipartFile file) throws Exception {
        List<Map<String, Object>> results = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    String clientCode = getCellValue(row.getCell(0));
                    String vehicleType = getCellValue(row.getCell(1));
                    int quantity = (int) Double.parseDouble(getCellValue(row.getCell(2)));
                    String deliveryDate = getCellValue(row.getCell(3));
                    String city = getCellValue(row.getCell(4));
                    String street = getCellValue(row.getCell(5));

                    Map<String, Object> vehicle = Map.of("vehicleType", vehicleType, "quantity", quantity);
                    Map<String, Object> address = Map.of("city", city, "street", street, "country", "Maroc");

                    Order order = Order.builder()
                        .id(UUID.randomUUID())
                        .clientCode(clientCode)
                        .clientId(clientCode)
                        .vehiclesJson(objectMapper.writeValueAsString(List.of(vehicle)))
                        .requestedDeliveryDate(LocalDate.parse(deliveryDate))
                        .deliveryAddressJson(objectMapper.writeValueAsString(address))
                        .status(OrderStatus.PENDING_VALIDATION)
                        .build();

                    orderRepository.save(order);
                    results.add(Map.of("row", i, "orderId", order.getId(), "status", "CREATED"));
                } catch (Exception e) {
                    results.add(Map.of("row", i, "status", "ERROR", "message", e.getMessage()));
                }
            }
        }
        return results;
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private String generateOrderNumber() {
        int year = Year.now().getValue();
        String prefix = "CMD-" + year;
        long count = orderRepository.countByOrderNumberPrefix(prefix);
        return String.format("%s-%06d", prefix, count + 1);
    }
}
