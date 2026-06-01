package com.optiflow.responsable.optimization.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class DeliveryStop {
    private int sequence;

    /** Identifiant de la commande principale (compatibilité rétrograde). */
    private UUID orderId;

    /**
     * Tous les identifiants de commandes à livrer à cet arrêt.
     * Plusieurs commandes du même client à la même adresse sont fusionnées en 1 arrêt.
     */
    private List<UUID> orderIds;

    /** Adresse complète de livraison (rue + ville). */
    private String address;

    /** Ville extraite séparément pour l'affichage dans les tables. */
    private String city;

    private Double lat;
    private Double lng;

    /** Label(s) des modèles de véhicules chargés dans cet arrêt. */
    private String vehicleModelLabel;

    /** Identifiants châssis (un par véhicule dans cet arrêt). */
    private List<String> chassisIds;

    /** Nombre de châssis dans cet arrêt (= chassisIds.size()). */
    private int quantity;

    private double weightKg;
    private double volumeM3;
}
