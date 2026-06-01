package com.optiflow.admin.vehicletype;

import com.optiflow.admin.vehicletype.dto.VehicleTypeRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleTypeService {

    private final VehicleTypeRepository repository;

    public List<VehicleType> getAll() {
        return repository.findAll();
    }

    public List<VehicleType> getActive() {
        return repository.findByActiveTrue();
    }

    public VehicleType getById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Type de véhicule introuvable"));
    }

    @Transactional
    public VehicleType create(VehicleTypeRequest req) {
        if (repository.existsByName(req.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un type de véhicule avec ce nom existe déjà");
        }
        VehicleType vt = VehicleType.builder()
            .name(req.getName())
            .description(req.getDescription())
            .maxWeightKg(req.getMaxWeightKg())
            .maxVolumeM3(req.getMaxVolumeM3())
            .active(true)
            .build();
        log.info("Vehicle type created: {}", req.getName());
        return repository.save(vt);
    }

    @Transactional
    public VehicleType update(Long id, VehicleTypeRequest req) {
        VehicleType vt = getById(id);
        if (!vt.getName().equals(req.getName()) && repository.existsByName(req.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un type de véhicule avec ce nom existe déjà");
        }
        vt.setName(req.getName());
        vt.setDescription(req.getDescription());
        vt.setMaxWeightKg(req.getMaxWeightKg());
        vt.setMaxVolumeM3(req.getMaxVolumeM3());
        log.info("Vehicle type updated: id={}", id);
        return repository.save(vt);
    }

    @Transactional
    public void deactivate(Long id) {
        VehicleType vt = getById(id);
        vt.setActive(false);
        repository.save(vt);
        log.info("Vehicle type deactivated: id={}", id);
    }

    @Transactional
    public void activate(Long id) {
        VehicleType vt = getById(id);
        vt.setActive(true);
        repository.save(vt);
        log.info("Vehicle type activated: id={}", id);
    }
}
