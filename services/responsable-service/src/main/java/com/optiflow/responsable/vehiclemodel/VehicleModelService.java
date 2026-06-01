package com.optiflow.responsable.vehiclemodel;

import com.optiflow.responsable.vehiclemodel.dto.VehicleModelRequest;
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
public class VehicleModelService {

    private final VehicleModelRepository repo;

    public List<VehicleModel> getAll() { return repo.findAll(); }

    public List<VehicleModel> getActive() { return repo.findByActiveTrue(); }

    public VehicleModel getById(UUID id) {
        return repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Modèle introuvable"));
    }

    public VehicleModel create(VehicleModelRequest req) {
        if (repo.existsByBrandAndModel(req.getBrand(), req.getModel()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce modèle existe déjà");
        return repo.save(VehicleModel.builder()
            .brand(req.getBrand())
            .model(req.getModel())
            .lengthCm(req.getLengthCm())
            .widthCm(req.getWidthCm())
            .heightCm(req.getHeightCm())
            .weightKg(req.getWeightKg())
            .description(req.getDescription())
            .build());
    }

    public VehicleModel update(UUID id, VehicleModelRequest req) {
        VehicleModel vm = getById(id);
        vm.setBrand(req.getBrand());
        vm.setModel(req.getModel());
        vm.setLengthCm(req.getLengthCm());
        vm.setWidthCm(req.getWidthCm());
        vm.setHeightCm(req.getHeightCm());
        vm.setWeightKg(req.getWeightKg());
        vm.setDescription(req.getDescription());
        return repo.save(vm);
    }

    public VehicleModel toggleActive(UUID id) {
        VehicleModel vm = getById(id);
        vm.setActive(!vm.isActive());
        return repo.save(vm);
    }

    public void delete(UUID id) {
        repo.delete(getById(id));
    }
}
