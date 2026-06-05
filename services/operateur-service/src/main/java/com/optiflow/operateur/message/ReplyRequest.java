package com.optiflow.operateur.message;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReplyRequest {
    @NotBlank
    private String chauffeurId;

    @NotBlank
    private String content;
}
