package com.emart.service;

import java.util.List;

import com.emart.dto.UserRequestDTO;
import com.emart.dto.UserResponseDTO;

public interface UserService {

    // Create User
    UserResponseDTO saveUser(UserRequestDTO userRequestDTO);

    // Get All Users
    List<UserResponseDTO> getAllUsers();

    // Get User By ID
    UserResponseDTO getUserById(Long userId);

    // Update User
    UserResponseDTO updateUser(Long userId, UserRequestDTO userRequestDTO);

    // Delete User
    void deleteUser(Long userId);

}