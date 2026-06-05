package com.optiflow.admin.user.dto;

import lombok.Data;

@Data
public class ImportClientRow {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String company;
    private String clientCode;
}
