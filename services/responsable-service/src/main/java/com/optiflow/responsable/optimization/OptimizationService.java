package com.optiflow.responsable.optimization;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optiflow.responsable.optimization.dto.*;
import com.optiflow.responsable.truck.Truck;
import com.optiflow.responsable.truck.TruckRepository;
import com.optiflow.responsable.truck.TruckStatus;
import com.optiflow.responsable.vehiclemodel.VehicleModel;
import com.optiflow.responsable.vehiclemodel.VehicleModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OptimizationService {

    private final TruckRepository truckRepo;
    private final VehicleModelRepository vehicleModelRepo;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    // ── Entrée principale ────────────────────────────────────────────────────

    public OptimizationResult optimize(OptimizationRequest req) {
        Map<UUID, VehicleModel> models = vehicleModelRepo.findAll()
            .stream().collect(Collectors.toMap(VehicleModel::getId, v -> v));

        List<Truck> trucks = (req.isAvailableTrucksOnly()
            ? truckRepo.findByStatus(TruckStatus.AVAILABLE)
            : truckRepo.findAll())
            .stream()
            .filter(t -> t.getChauffeurId() != null && !t.getChauffeurId().isBlank())
            .collect(Collectors.toList());

        if (trucks.isEmpty())
            return noTrucksResult(req.getOrderIds());

        List<OrderItem> items = loadOrders(req.getOrderIds(), models);
        if (items.isEmpty())
            return OptimizationResult.builder()
                .message("Aucune commande validée trouvée").proposedTournees(List.of())
                .unscheduledOrderIds(List.of()).totalOrders(0).scheduledOrders(0)
                .averageFillRate(0).build();

        log.info("Optimization start: {} orders, {} trucks, radius={}km, dateWindow={}d",
            items.size(), trucks.size(), req.getClusterRadiusKm(), req.getDateWindowDays());

        // ── ÉTAPE 1 : Clustering par date puis géographique ─────────────────
        List<DateGeoCluster> clusters = buildClusters(items, req.getClusterRadiusKm(), req.getDateWindowDays());
        log.info("Clusters built: {}", clusters.size());

        // ── ÉTAPE 2 : Bin packing — règle : 1 camion = 1 seule tournée par jour ─
        // usedTrucksByDate empêche qu'un camion soit assigné deux fois le même jour.
        // Si tous les camions sont pris pour une date, les commandes sont reportées au lendemain.
        List<ProposedTournee> result       = new ArrayList<>();
        List<UUID>            unscheduled  = new ArrayList<>();
        List<OrderItem>       noTruckItems = new ArrayList<>();

        Map<String, Set<UUID>> usedTrucksByDate = new HashMap<>();

        for (DateGeoCluster cluster : clusters) {
            String   dateKey    = cluster.plannedDate() != null ? cluster.plannedDate() : "nodate";
            Set<UUID> usedToday = usedTrucksByDate.computeIfAbsent(dateKey, k -> new HashSet<>());

            List<Truck> availableToday = trucks.stream()
                .filter(t -> !usedToday.contains(t.getId()))
                .collect(Collectors.toList());

            // Plus aucun camion libre ce jour-là → reporter au lendemain
            if (availableToday.isEmpty() && cluster.plannedDate() != null) {
                noTruckItems.addAll(cluster.items());
                log.info("Plus de camions pour le {} — {} commande(s) reportées au lendemain",
                    cluster.plannedDate(), cluster.items().size());
                continue;
            }

            packCluster(cluster.items(), availableToday, usedToday,
                        cluster.plannedDate(), result, unscheduled, models);
        }

        // ── ÉTAPE 3 : Fallback — reporter au lendemain si camions épuisés ────
        if (!noTruckItems.isEmpty()) {
            String    tomorrow   = LocalDate.now().plusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
            Set<UUID> usedTom    = usedTrucksByDate.computeIfAbsent(tomorrow, k -> new HashSet<>());
            List<Truck> availTom = trucks.stream()
                .filter(t -> !usedTom.contains(t.getId()))
                .collect(Collectors.toList());

            if (availTom.isEmpty()) {
                noTruckItems.stream().map(OrderItem::orderId).forEach(unscheduled::add);
                log.warn("Aucun camion non plus demain — {} commande(s) non planifiées", noTruckItems.size());
            } else {
                // Reconstruire les clusters avec la date de demain
                List<OrderItem> tomorrowItems = noTruckItems.stream().distinct()
                    .map(i -> new OrderItem(i.orderId(), i.vehicleModelId(), i.vehicleType(),
                        i.chassisId(), i.address(), i.city(), i.lat(), i.lng(),
                        LocalDate.parse(tomorrow)))
                    .collect(Collectors.toList());

                for (DateGeoCluster tc : buildClusters(tomorrowItems, req.getClusterRadiusKm(), req.getDateWindowDays())) {
                    List<Truck> avail = trucks.stream()
                        .filter(t -> !usedTom.contains(t.getId()))
                        .collect(Collectors.toList());
                    if (avail.isEmpty()) {
                        tc.items().stream().map(OrderItem::orderId).forEach(unscheduled::add);
                    } else {
                        packCluster(tc.items(), avail, usedTom, tomorrow, result, unscheduled, models);
                    }
                }
                log.info("{} commande(s) reportées et planifiées pour le lendemain ({})",
                    noTruckItems.size(), tomorrow);
            }
        }

        double avgFill      = result.stream().mapToDouble(ProposedTournee::getFillRatePercent).average().orElse(0);
        int    scheduledCnt = items.size() - (int) unscheduled.stream().distinct().count();

        return OptimizationResult.builder()
            .proposedTournees(result)
            .unscheduledOrderIds(unscheduled.stream().distinct().toList())
            .totalOrders(items.size())
            .scheduledOrders(scheduledCnt)
            .averageFillRate(Math.round(avgFill * 10.0) / 10.0)
            .message(String.format("%d tournées proposées pour %d commandes — taux moyen %.1f%%",
                result.size(), items.size(), avgFill))
            .build();
    }

    // ── Bin packing FFD pour un cluster (1 camion max par jour par camion) ───
    private void packCluster(
            List<OrderItem> items, List<Truck> availableTrucks, Set<UUID> usedTrucksForDate,
            String plannedDate, List<ProposedTournee> result, List<UUID> unscheduled,
            Map<UUID, VehicleModel> models) {

        List<VehicleUnit> units = expandToUnits(items, models);
        units.sort(Comparator.comparingDouble(VehicleUnit::volumeM3).reversed());

        List<TruckAssignment> assignments = new ArrayList<>();

        for (VehicleUnit unit : units) {
            // 1. Charger dans un chargement déjà ouvert s'il reste de la place
            TruckAssignment fit = assignments.stream()
                .filter(a -> a.canFit(unit))
                .findFirst().orElse(null);

            if (fit != null) {
                fit.load(unit);
            } else {
                // 2. Ouvrir un nouveau chargement avec le plus petit camion encore libre ce jour
                // Le filtre sur usedTrucksForDate est dynamique : chaque truck ajouté dans la boucle
                // précédente est automatiquement exclu des itérations suivantes.
                Truck suitable = availableTrucks.stream()
                    .filter(t -> !usedTrucksForDate.contains(t.getId()))
                    .filter(t -> new TruckAssignment(t).canFit(unit))
                    .min(Comparator.comparingDouble(Truck::getMaxVolumeM3))
                    .orElse(null);

                if (suitable != null) {
                    TruckAssignment newA = new TruckAssignment(suitable);
                    newA.load(unit);
                    assignments.add(newA);
                    usedTrucksForDate.add(suitable.getId()); // bloquer ce camion pour le reste de la journée
                } else {
                    unscheduled.add(unit.orderId());
                    log.warn("Véhicule {} ({}×{}×{} cm, {} kg) ne rentre dans aucun camion disponible",
                        unit.label(), (int)unit.lengthCm(), (int)unit.widthCm(),
                        (int)unit.heightCm(), (int)unit.weightKg());
                }
            }
        }

        // ── Clarke-Wright pour chaque chargement ────────────────────────────
        for (TruckAssignment a : assignments) {
            result.add(buildProposedTournee(a, plannedDate));
        }
    }

    // ── AMÉLIORATION 2 : Clustering date + géographique ─────────────────────

    /**
     * Groupe par date exacte de livraison, puis par proximité géographique.
     * Des commandes avec des dates différentes ne peuvent jamais être dans la même tournée.
     */
    private List<DateGeoCluster> buildClusters(List<OrderItem> items, double radiusKm, int windowDays) {
        List<OrderItem> withDate = items.stream().filter(i -> i.deliveryDate() != null).toList();
        List<OrderItem> noDate   = items.stream().filter(i -> i.deliveryDate() == null).toList();

        List<DateGeoCluster> result = new ArrayList<>();

        // Grouper par date exacte — chaque date produit ses propres tournées
        Map<LocalDate, List<OrderItem>> byExactDate = new LinkedHashMap<>();
        for (OrderItem item : withDate) {
            byExactDate.computeIfAbsent(item.deliveryDate(), k -> new ArrayList<>()).add(item);
        }

        for (Map.Entry<LocalDate, List<OrderItem>> entry : byExactDate.entrySet()) {
            String plannedDate = entry.getKey().format(DateTimeFormatter.ISO_LOCAL_DATE);
            for (List<OrderItem> geoCluster : geoCluster(entry.getValue(), radiusKm)) {
                result.add(new DateGeoCluster(geoCluster, plannedDate));
            }
        }

        // Commandes sans date → cluster géographique seul
        if (!noDate.isEmpty()) {
            for (List<OrderItem> geoCluster : geoCluster(noDate, radiusKm)) {
                result.add(new DateGeoCluster(geoCluster, null));
            }
        }

        return result;
    }

    /** Clustering géographique par rayon autour d'un seed (greedy). */
    private List<List<OrderItem>> geoCluster(List<OrderItem> items, double radiusKm) {
        List<OrderItem> withCoords = items.stream().filter(i -> i.lat() != null).toList();
        List<OrderItem> noCoords   = items.stream().filter(i -> i.lat() == null).toList();

        List<List<OrderItem>> clusters = new ArrayList<>();
        List<OrderItem> remaining = new ArrayList<>(withCoords);

        while (!remaining.isEmpty()) {
            OrderItem seed = remaining.remove(0);
            List<OrderItem> group = new ArrayList<>();
            group.add(seed);
            remaining.removeIf(other -> {
                if (haversine(seed.lat(), seed.lng(), other.lat(), other.lng()) <= radiusKm) {
                    group.add(other);
                    return true;
                }
                return false;
            });
            clusters.add(group);
        }
        if (!noCoords.isEmpty()) clusters.add(new ArrayList<>(noCoords));
        return clusters;
    }

    // ── FFD helpers ──────────────────────────────────────────────────────────

    private List<VehicleUnit> expandToUnits(List<OrderItem> items, Map<UUID, VehicleModel> models) {
        List<VehicleUnit> units = new ArrayList<>();
        for (OrderItem item : items) {
            VehicleModel vm = item.vehicleModelId() != null ? models.get(item.vehicleModelId()) : null;
            double lengthCm = vm != null ? vm.getLengthCm() : 450;
            double widthCm  = vm != null ? vm.getWidthCm()  : 200;
            double heightCm = vm != null ? vm.getHeightCm() : 150;
            double weightKg = vm != null ? vm.getWeightKg() : 1200;
            String label    = vm != null ? vm.getBrand() + " " + vm.getModel() : item.vehicleType();
            double volM3    = (lengthCm * widthCm * heightCm) / 1_000_000.0;
            // Un OrderItem = un châssis (plus d'expansion par quantité)
            units.add(new VehicleUnit(item.orderId(), item.chassisId(), label,
                item.address(), item.city(), item.lat(), item.lng(),
                lengthCm, widthCm, heightCm, weightKg, volM3));
        }
        return units;
    }

    // ── Construction tournée avec routage Clarke-Wright ──────────────────────

    private ProposedTournee buildProposedTournee(TruckAssignment a, String plannedDate) {
        // AMÉLIORATION 3 : Clarke-Wright savings pour ordonner les arrêts
        List<VehicleUnit> ordered = clarkeWrightRoute(a.units());
        Truck t = a.truck();

        double totalWeight = ordered.stream().mapToDouble(VehicleUnit::weightKg).sum();
        double totalVolume = ordered.stream().mapToDouble(VehicleUnit::volumeM3).sum();
        double fillRate    = Math.min(100.0, (totalVolume / t.getMaxVolumeM3()) * 100.0);
        double distanceKm  = estimateRouteKm(ordered);

        // Regrouper par adresse normalisée — même adresse exacte (ville+rue) = 1 seul arrêt
        // Si pas d'adresse, fallback par orderId pour éviter les fusions incorrectes
        Map<String, List<VehicleUnit>> byAddress = new LinkedHashMap<>();
        for (VehicleUnit u : ordered) {
            String key = normalizeAddressKey(u.address(), u.city(), u.orderId());
            byAddress.computeIfAbsent(key, k -> new ArrayList<>()).add(u);
        }

        List<DeliveryStop> stops = new ArrayList<>();
        int seq = 1;
        for (Map.Entry<String, List<VehicleUnit>> entry : byAddress.entrySet()) {
            VehicleUnit first = entry.getValue().get(0);
            double stopWeight = entry.getValue().stream().mapToDouble(VehicleUnit::weightKg).sum();
            double stopVolume = entry.getValue().stream().mapToDouble(VehicleUnit::volumeM3).sum();

            List<String> chassisIds = entry.getValue().stream()
                .map(VehicleUnit::chassisId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

            String modelLabel = entry.getValue().stream()
                .map(VehicleUnit::label)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.joining(", "));

            // Tous les orderIds groupés dans cet arrêt (peut être plusieurs commandes à la même adresse)
            List<UUID> orderIds = entry.getValue().stream()
                .map(VehicleUnit::orderId)
                .distinct()
                .collect(Collectors.toList());

            stops.add(DeliveryStop.builder()
                .sequence(seq++)
                .orderId(orderIds.get(0))   // commande principale (rétrocompatibilité)
                .orderIds(orderIds)
                .address(first.address())
                .city(first.city())
                .lat(first.lat())
                .lng(first.lng())
                .vehicleModelLabel(modelLabel.isEmpty() ? first.label() : modelLabel)
                .chassisIds(chassisIds)
                .quantity(entry.getValue().size())
                .weightKg(stopWeight)
                .volumeM3(stopVolume)
                .build());
        }

        return ProposedTournee.builder()
            .truckId(t.getId())
            .truckPlate(t.getPlateNumber())
            .truckLabel(t.getBrand() + " " + t.getModel())
            .truckMaxWeightKg(t.getMaxWeightKg())
            .truckMaxVolumeM3(t.getMaxVolumeM3())
            .plannedDate(plannedDate)
            .stops(stops)
            .totalWeightKg(Math.round(totalWeight * 10.0) / 10.0)
            .totalVolumeM3(Math.round(totalVolume * 100.0) / 100.0)
            .fillRatePercent(Math.round(fillRate * 10.0) / 10.0)
            .estimatedDistanceKm(Math.round(distanceKm * 10.0) / 10.0)
            .totalOrders(byAddress.size())
            .build();
    }

    // ── AMÉLIORATION 3 : Algorithme de savings Clarke-Wright ─────────────────
    //
    // Principe : on calcule le "gain" de relier deux arrêts directement
    // plutôt que de faire depot→i→depot + depot→j→depot.
    // saving(i,j) = d(depot,i) + d(depot,j) - d(i,j)
    // On fusionne les routes dans l'ordre décroissant des savings.
    //
    private List<VehicleUnit> clarkeWrightRoute(List<VehicleUnit> units) {
        int n = units.size();
        if (n <= 2) return new ArrayList<>(units);

        // Centroïde comme dépôt virtuel
        double depotLat = 0, depotLng = 0;
        int withCoords = 0;
        for (VehicleUnit u : units) {
            if (u.lat() != null) { depotLat += u.lat(); depotLng += u.lng(); withCoords++; }
        }
        // Pas assez de coordonnées → fallback nearest-neighbor
        if (withCoords < 2) return nearestNeighborList(units);
        depotLat /= withCoords;
        depotLng /= withCoords;

        // Calculer tous les savings
        List<Saving> savings = new ArrayList<>(n * (n - 1) / 2);
        for (int ni = 0; ni < n; ni++) {
            for (int nj = ni + 1; nj < n; nj++) {
                VehicleUnit ui = units.get(ni), uj = units.get(nj);
                if (ui.lat() == null || uj.lat() == null) continue;
                double sv = haversine(depotLat, depotLng, ui.lat(), ui.lng())
                          + haversine(depotLat, depotLng, uj.lat(), uj.lng())
                          - haversine(ui.lat(), ui.lng(), uj.lat(), uj.lng());
                savings.add(new Saving(ni, nj, sv));
            }
        }
        savings.sort(Comparator.comparingDouble(Saving::value).reversed());

        // Initialiser : chaque nœud dans sa propre route
        Map<Integer, LinkedList<Integer>> nodeToRoute = new HashMap<>(n);
        Set<LinkedList<Integer>> activeRoutes = new LinkedHashSet<>(n);
        for (int ni = 0; ni < n; ni++) {
            LinkedList<Integer> r = new LinkedList<>(List.of(ni));
            nodeToRoute.put(ni, r);
            activeRoutes.add(r);
        }

        // Fusionner les routes selon les savings
        for (Saving s : savings) {
            LinkedList<Integer> ri = nodeToRoute.get(s.nodeI());
            LinkedList<Integer> rj = nodeToRoute.get(s.nodeJ());
            if (ri == rj || !activeRoutes.contains(ri) || !activeRoutes.contains(rj)) continue;

            boolean iEnd   = ri.getLast()  == s.nodeI();
            boolean iStart = ri.getFirst() == s.nodeI();
            boolean jStart = rj.getFirst() == s.nodeJ();
            boolean jEnd   = rj.getLast()  == s.nodeJ();

            LinkedList<Integer> merged = null;

            if (iEnd && jStart) {
                // ri → rj
                merged = new LinkedList<>(ri);
                merged.addAll(rj);
            } else if (iStart && jEnd) {
                // rj → ri
                merged = new LinkedList<>(rj);
                merged.addAll(ri);
            } else if (iEnd && jEnd) {
                // ri → reverse(rj)
                merged = new LinkedList<>(ri);
                Iterator<Integer> it = rj.descendingIterator();
                while (it.hasNext()) merged.addLast(it.next());
            } else if (iStart && jStart) {
                // reverse(ri) → rj
                merged = new LinkedList<>();
                Iterator<Integer> it = ri.descendingIterator();
                while (it.hasNext()) merged.addLast(it.next());
                merged.addAll(rj);
            }

            if (merged != null) {
                activeRoutes.remove(ri);
                activeRoutes.remove(rj);
                activeRoutes.add(merged);
                for (int node : merged) nodeToRoute.put(node, merged);
            }
        }

        // Construire la liste finale (routes restantes dans l'ordre)
        List<VehicleUnit> result = new ArrayList<>(n);
        for (LinkedList<Integer> route : activeRoutes) {
            for (int idx : route) result.add(units.get(idx));
        }
        return result;
    }

    /** Fallback nearest-neighbor quand les coordonnées manquent. */
    private List<VehicleUnit> nearestNeighborList(List<VehicleUnit> units) {
        if (units.size() <= 1) return new ArrayList<>(units);
        List<VehicleUnit> result    = new ArrayList<>();
        List<VehicleUnit> remaining = new ArrayList<>(units);
        VehicleUnit current = remaining.remove(0);
        result.add(current);
        while (!remaining.isEmpty()) {
            final VehicleUnit cur = current;
            VehicleUnit nearest = remaining.stream().min(Comparator.comparingDouble(c -> {
                if (cur.lat() == null || c.lat() == null) return Double.MAX_VALUE;
                return haversine(cur.lat(), cur.lng(), c.lat(), c.lng());
            })).orElse(remaining.get(0));
            remaining.remove(nearest);
            result.add(nearest);
            current = nearest;
        }
        return result;
    }

    private double estimateRouteKm(List<VehicleUnit> units) {
        double total = 0;
        for (int i = 1; i < units.size(); i++) {
            VehicleUnit a = units.get(i - 1), b = units.get(i);
            if (a.lat() != null && b.lat() != null)
                total += haversine(a.lat(), a.lng(), b.lat(), b.lng());
        }
        return total;
    }

    // ── Lecture commandes depuis operateur_db ────────────────────────────────

    private List<OrderItem> loadOrders(List<UUID> ids, Map<UUID, VehicleModel> models) {
        // Include VALIDATED orders + PLANNED orders whose tournée is not yet validated by responsable
        String where = (ids == null || ids.isEmpty())
            ? "(status = 'VALIDATED' OR (status = 'PLANNED' AND tournee_id IN (SELECT id FROM tournees WHERE status = 'PENDING_RESPONSABLE_VALIDATION')))"
            : "id IN (" + ids.stream().map(id -> "'" + id + "'").collect(Collectors.joining(",")) + ") AND status IN ('VALIDATED', 'PLANNED')";

        // Requête complète avec colonnes géo + date
        String fullSql = "SELECT id, vehicles_json, delivery_address_json, " +
                         "delivery_lat, delivery_lng, requested_delivery_date " +
                         "FROM orders WHERE " + where;
        // Fallback si colonnes géo absentes (ex: service pas encore rebuild)
        String baseSql = "SELECT id, vehicles_json, delivery_address_json " +
                         "FROM orders WHERE " + where;

        try {
            return jdbc.query(fullSql, (rs, i) -> parseOrderRow(rs, true))
                       .stream().flatMap(Collection::stream).toList();
        } catch (Exception e) {
            log.warn("Colonnes géo absentes, fallback sans coords: {}", e.getMessage());
            try {
                return jdbc.query(baseSql, (rs, i) -> parseOrderRow(rs, false))
                           .stream().flatMap(Collection::stream).toList();
            } catch (Exception e2) {
                log.error("Impossible de lire les commandes: {}", e2.getMessage());
                return List.of();
            }
        }
    }

    private List<OrderItem> parseOrderRow(java.sql.ResultSet rs, boolean hasGeoAndDate) {
        try {
            UUID orderId = UUID.fromString(rs.getString("id"));
            String vehiclesJson = rs.getString("vehicles_json");
            String addressJson  = rs.getString("delivery_address_json");

            Double latVal = null, lngVal = null;
            LocalDate deliveryDate = null;

            if (hasGeoAndDate) {
                double lat = rs.getDouble("delivery_lat");
                latVal = rs.wasNull() ? null : lat;
                double lng = rs.getDouble("delivery_lng");
                lngVal = rs.wasNull() ? null : lng;

                java.sql.Date sqlDate = rs.getDate("requested_delivery_date");
                deliveryDate = sqlDate != null ? sqlDate.toLocalDate() : null;
            }

            JsonNode vehicles = mapper.readTree(vehiclesJson);
            String address = parseAddress(addressJson);
            String city    = parseCity(addressJson);

            List<OrderItem> result = new ArrayList<>();
            if (vehicles.isArray()) {
                for (JsonNode v : vehicles) {
                    UUID modelId = v.has("vehicleModelId") && !v.get("vehicleModelId").isNull()
                            && !v.get("vehicleModelId").asText().isBlank()
                        ? UUID.fromString(v.get("vehicleModelId").asText()) : null;

                    // Label : préférer vehicleModelLabel, puis vehicleType
                    String vehicleType = v.has("vehicleModelLabel") && !v.get("vehicleModelLabel").asText().isBlank()
                        ? v.get("vehicleModelLabel").asText()
                        : v.has("vehicleType") ? v.get("vehicleType").asText() : "INCONNU";

                    if (v.has("chassisId") && !v.get("chassisId").asText().isBlank()) {
                        // Nouveau format : un châssis par entrée
                        String chassisId = v.get("chassisId").asText();
                        result.add(new OrderItem(orderId, modelId, vehicleType, chassisId,
                            address, city, latVal, lngVal, deliveryDate));
                    } else {
                        // Ancien format (quantity) — rétro-compatibilité
                        int qty = v.has("quantity") ? v.get("quantity").asInt(1) : 1;
                        for (int q = 0; q < qty; q++) {
                            result.add(new OrderItem(orderId, modelId, vehicleType, null,
                                address, city, latVal, lngVal, deliveryDate));
                        }
                    }
                }
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to parse order row: {}", e.getMessage());
            return List.of();
        }
    }

    private String parseAddress(String json) {
        if (json == null) return "Adresse inconnue";
        try {
            JsonNode node = mapper.readTree(json);
            return node.path("street").asText("") + ", " + node.path("city").asText("");
        } catch (Exception e) {
            return "Adresse inconnue";
        }
    }

    private String parseCity(String json) {
        if (json == null) return "";
        try {
            return mapper.readTree(json).path("city").asText("");
        } catch (Exception e) {
            return "";
        }
    }

    // ── Normalisation adresse pour regroupement des arrêts ───────────────────

    /**
     * Clé de regroupement : même ville + même rue = même arrêt.
     * Si l'adresse est vide (pas de données géo), on regroupe par orderId pour éviter
     * de fusionner des commandes sans adresse connue.
     */
    private String normalizeAddressKey(String address, String city, UUID orderId) {
        String a = address != null ? address.toLowerCase().trim().replaceAll("\\s+", " ") : "";
        String c = city    != null ? city   .toLowerCase().trim().replaceAll("\\s+", " ") : "";
        if (a.isEmpty() && c.isEmpty()) return "order:" + orderId;
        return "addr:" + c + "|" + a;
    }

    // ── Formule de Haversine ─────────────────────────────────────────────────

    private double haversine(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ── Records et classes internes ──────────────────────────────────────────

    record OrderItem(UUID orderId, UUID vehicleModelId, String vehicleType,
                     String chassisId,
                     String address, String city, Double lat, Double lng,
                     LocalDate deliveryDate) {}

    record VehicleUnit(UUID orderId, String chassisId, String label,
                       String address, String city, Double lat, Double lng,
                       double lengthCm, double widthCm, double heightCm,
                       double weightKg, double volumeM3) {}

    record DateGeoCluster(List<OrderItem> items, String plannedDate) {}

    /** Saving Clarke-Wright : gain obtenu en reliant nodeI et nodeJ directement. */
    private record Saving(int nodeI, int nodeJ, double value) {}

    static class TruckAssignment {
        final Truck truck;
        private double remainingWeightKg;
        private double remainingVolumeM3;
        private final List<VehicleUnit> units = new ArrayList<>();

        TruckAssignment(Truck t) {
            this.truck = t;
            this.remainingWeightKg = t.getMaxWeightKg();
            this.remainingVolumeM3 = t.getMaxVolumeM3();
        }

        /**
         * AMÉLIORATION 1 : vérification poids + volume + dimensions physiques.
         * On teste 2 orientations du véhicule dans la caisse du camion :
         * - orientation normale  : longueur véhicule ≤ longueur caisse
         * - orientation pivotée  : largeur véhicule  ≤ longueur caisse (rotation 90°)
         * La hauteur est toujours fixe (on ne retourne pas une voiture).
         */
        boolean canFit(VehicleUnit u) {
            if (remainingWeightKg < u.weightKg()) return false;
            if (remainingVolumeM3 < u.volumeM3())  return false;

            int tL = truck.getInternalLengthCm();
            int tW = truck.getInternalWidthCm();
            int tH = truck.getInternalHeightCm();

            // La hauteur doit obligatoirement passer
            if (u.heightCm() > tH) return false;

            // Vérifier si le véhicule rentre dans la caisse (une des deux orientations)
            boolean normalOrientation = u.lengthCm() <= tL && u.widthCm() <= tW;
            boolean rotated90         = u.widthCm()  <= tL && u.lengthCm() <= tW;
            return normalOrientation || rotated90;
        }

        void load(VehicleUnit u) {
            units.add(u);
            remainingWeightKg -= u.weightKg();
            remainingVolumeM3 -= u.volumeM3();
        }

        List<VehicleUnit> units() { return units; }
        Truck truck()             { return truck; }
    }

    // ── Helpers résultat vide ────────────────────────────────────────────────

    private OptimizationResult noTrucksResult(List<UUID> ids) {
        return OptimizationResult.builder()
            .message("Aucun camion disponible — ajoutez des camions avec le statut AVAILABLE")
            .proposedTournees(List.of())
            .unscheduledOrderIds(ids != null ? ids : List.of())
            .totalOrders(0).scheduledOrders(0).averageFillRate(0)
            .build();
    }
}
