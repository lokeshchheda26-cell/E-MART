package com.emart.dto;

public class LoginResponseDTO {

    private String token;
    private String type;
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    /**
     * Whether this customer holds an eMCard.
     *
     * The frontend needs this to honour Condition 1 (a normal
     * customer is shown MRP only, with no eMCard price or point
     * offer). The server already strips the offer from every product
     * response, so this is the belt to that pair of braces - it lets
     * the UI hide the eMCard controls outright rather than relying on
     * the values having been flattened.
     */
    private Boolean isEmcardMember;

    public LoginResponseDTO() {
    }

    public LoginResponseDTO(String token, String type, Long userId,
                            String firstName, String lastName,
                            String email, String role) {
        this.token = token;
        this.type = type;
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.role = role;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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

    public Boolean getIsEmcardMember() {
        return isEmcardMember;
    }

    public void setIsEmcardMember(Boolean isEmcardMember) {
        this.isEmcardMember = isEmcardMember;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}