package com.optiflow.admin.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportResult {

    private int total;
    private int created;
    private int failed;
    private List<CreatedAccount> accounts;
    private List<String> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreatedAccount {
        private String clientCode;
        private String username;
        private String fullName;
        private String email;
        private String password;
    }
}
