package com.emart.serviceimpl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.emart.dto.UserRequestDTO;
import com.emart.dto.UserResponseDTO;
import com.emart.entity.User;
import com.emart.repository.UserRepository;
import com.emart.service.UserService;
import com.emart.util.MapperUtil;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public UserResponseDTO saveUser(UserRequestDTO userRequestDTO) {

        if (userRepository.existsByEmail(userRequestDTO.getEmail())) {
            throw new RuntimeException("Email already exists.");
        }

        if (userRequestDTO.getPhone() != null &&
                userRepository.existsByPhone(userRequestDTO.getPhone())) {
            throw new RuntimeException("Phone number already exists.");
        }

        User user = MapperUtil.toEntity(userRequestDTO);
        user.setPassword(passwordEncoder.encode(userRequestDTO.getPassword()));

        User savedUser = userRepository.save(user);

        return MapperUtil.toResponseDTO(savedUser);
    }

    @Override
    public List<UserResponseDTO> getAllUsers() {

        List<User> users = userRepository.findAll();

        return users.stream()
                .map(MapperUtil::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponseDTO getUserById(Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID : " + userId));

        return MapperUtil.toResponseDTO(user);
    }

    @Override
    public UserResponseDTO updateUser(Long userId, UserRequestDTO userRequestDTO) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID : " + userId));

        user.setFirstName(userRequestDTO.getFirstName());
        user.setLastName(userRequestDTO.getLastName());
        user.setEmail(userRequestDTO.getEmail());
        if (userRequestDTO.getPassword() != null
                && !userRequestDTO.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(userRequestDTO.getPassword()));
        }
        user.setPhone(userRequestDTO.getPhone());
        user.setAddress(userRequestDTO.getAddress());
        user.setGender(userRequestDTO.getGender());
        user.setDob(userRequestDTO.getDob());

        User updatedUser = userRepository.save(user);

        return MapperUtil.toResponseDTO(updatedUser);
    }

    @Override
    public void deleteUser(Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID : " + userId));

        userRepository.delete(user);
    }

}