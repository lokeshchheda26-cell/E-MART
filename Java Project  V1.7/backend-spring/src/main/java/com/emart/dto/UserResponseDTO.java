package com.emart.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.emart.entity.Gender;
import com.emart.entity.Role;

public class UserResponseDTO {

    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private Gender gender;
    private LocalDate dob;
    private Role role;
    private Boolean isEmcardMember;
    private Integer emcardPoints;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public UserResponseDTO() {
    }

    public UserResponseDTO(Long userId, String firstName, String lastName, String email,
                           String phone, String address, Gender gender, LocalDate dob,
                           Role role, Boolean isEmcardMember, Integer emcardPoints) {
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.gender = gender;
        this.dob = dob;
        this.role = role;
        this.isEmcardMember = isEmcardMember;
        this.emcardPoints = emcardPoints;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Boolean getIsEmcardMember() {
        return isEmcardMember;
    }

    public void setIsEmcardMember(Boolean isEmcardMember) {
        this.isEmcardMember = isEmcardMember;
    }

    public Integer getEmcardPoints() {
        return emcardPoints;
    }

    public void setEmcardPoints(Integer emcardPoints) {
        this.emcardPoints = emcardPoints;
    }
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}