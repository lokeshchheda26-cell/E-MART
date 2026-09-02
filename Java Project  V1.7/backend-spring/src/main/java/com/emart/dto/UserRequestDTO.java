package com.emart.dto;

import java.time.LocalDate;

import com.emart.entity.Gender;

public class UserRequestDTO {

	private String firstName;
	private String lastName;
	private String email;
	private String password;
	private String phone;
	private String address;
	private Gender gender;
	private LocalDate dob;
	private Boolean isEmcardMember=false;

	public UserRequestDTO() {
	}

	public UserRequestDTO(String firstName, String lastName, String email, String password, String phone,
			String address, Gender gender, LocalDate dob, Boolean isEmcardMember) {

		this.firstName = firstName;
		this.lastName = lastName;
		this.email = email;
		this.password = password;
		this.phone = phone;
		this.address = address;
		this.gender = gender;
		this.dob = dob;
		this.isEmcardMember = isEmcardMember != null ? isEmcardMember : false;
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

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
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
	public Boolean getIsEmcardMember() {
	    return isEmcardMember != null ? isEmcardMember : false;
	}

	public void setIsEmcardMember(Boolean isEmcardMember) {
	    this.isEmcardMember = isEmcardMember != null ? isEmcardMember : false;
	}
}