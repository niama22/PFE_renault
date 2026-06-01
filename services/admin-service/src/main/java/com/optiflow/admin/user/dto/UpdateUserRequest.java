package com.optiflow.admin.user.dto;

import lombok.Data;

import java.util.List;

@Data
public class UpdateUserRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String company;
    private Boolean enabled;
    private List<String> roles;
}
