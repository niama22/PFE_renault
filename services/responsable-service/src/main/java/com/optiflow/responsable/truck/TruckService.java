package com.optiflow.responsable.truck;

import com.optiflow.responsable.truck.dto.TruckRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TruckService {

    private final TruckRepository repo;

    public List<Truck> getAll() { return repo.findAll(); }

    public List<Truck> getAvailable() { return repo.findByStatus(TruckStatus.AVAILABLE); }

    public Truck getById(UUID id) {
        return repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Camion introuvable"));
    }

    public Truck create(TruckRequest req) {
        if (repo.existsByPlateNumber(req.getPlateNumber()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Immatriculation déjà enregistrée");
        return repo.save(Truck.builder()
            .plateNumber(req.getPlateNumber())
            .brand(req.getBrand())
            .model(req.getModel())
            .maxWeightKg(req.getMaxWeightKg())
            .maxVolumeM3(req.getMaxVolumeM3())
            .internalLengthCm(req.getInternalLengthCm())
            .internalWidthCm(req.getInternalWidthCm())
            .internalHeightCm(req.getInternalHeightCm())
            .chauffeurId(req.getChauffeurId())
            .chauffeurName(req.getChauffeurName())
            .notes(req.getNotes())
            .build());
    }

    public Truck update(UUID id, TruckRequest req) {
        Truck truck = getById(id);
        truck.setPlateNumber(req.getPlateNumber());
        truck.setBrand(req.getBrand());
        truck.setModel(req.getModel());
        truck.setMaxWeightKg(req.getMaxWeightKg());
        truck.setMaxVolumeM3(req.getMaxVolumeM3());
        truck.setInternalLengthCm(req.getInternalLengthCm());
        truck.setInternalWidthCm(req.getInternalWidthCm());
        truck.setInternalHeightCm(req.getInternalHeightCm());
        truck.setChauffeurId(req.getChauffeurId());
        truck.setChauffeurName(req.getChauffeurName());
        truck.setNotes(req.getNotes());
        return repo.save(truck);
    }

    public Truck updateStatus(UUID id, TruckStatus status) {
        Truck truck = getById(id);
        truck.setStatus(status);
        return repo.save(truck);
    }

    public void delete(UUID id) {
        Truck truck = getById(id);
        if (truck.getStatus() == TruckStatus.IN_USE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Impossible de supprimer un camion en service");
        repo.delete(truck);
    }
}
