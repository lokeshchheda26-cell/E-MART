package com.emart.util;

import com.emart.dto.UserRequestDTO;
import com.emart.dto.UserResponseDTO;
import com.emart.entity.Role;
import com.emart.entity.User;

public class MapperUtil {

    // Convert Request DTO to Entity
    public static User toEntity(UserRequestDTO dto) {

        User user = new User();

        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setEmail(dto.getEmail());
        user.setPassword(dto.getPassword());
        user.setPhone(dto.getPhone());
        user.setAddress(dto.getAddress());
        user.setGender(dto.getGender());
        user.setDob(dto.getDob());

        // Default values
        user.setRole(Role.CUSTOMER);
        user.setIsEmcardMember(false);
        user.setEmcardPoints(0);

        return user;
    }

    // Convert Entity to Response DTO
    public static UserResponseDTO toResponseDTO(User user) {

        UserResponseDTO dto = new UserResponseDTO();

        dto.setUserId(user.getUserId());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setAddress(user.getAddress());
        dto.setGender(user.getGender());
        dto.setDob(user.getDob());
        dto.setRole(user.getRole());
        dto.setIsEmcardMember(user.getIsEmcardMember());
        dto.setEmcardPoints(user.getEmcardPoints());

        return dto;
    }

}