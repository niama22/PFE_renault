package com.optiflow.responsable.optimization.dto;

import lombok.Data;
import java.util.List;

@Data
public class ConfirmPlanningRequest {
    private List<ProposedTournee> proposedTournees;
    private String operatorNotes;
}
