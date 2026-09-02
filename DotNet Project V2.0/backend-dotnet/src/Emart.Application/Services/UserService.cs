using AutoMapper;
using Emart.Application.Common.Exceptions;
using Emart.Application.Dtos;
using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Emart.Domain.Enums;

namespace Emart.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;
    private readonly IPasswordHasher _passwordHasher;

    public UserService(IUserRepository userRepository, IMapper mapper, IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _mapper = mapper;
        _passwordHasher = passwordHasher;
    }

    public async Task<UserResponseDTO> SaveUserAsync(UserRequestDTO request, CancellationToken ct = default)
    {
        // UserRequestDTO is shared with UpdateUserAsync, where a blank password means "leave it
        // unchanged" - so it can't be required at the DTO level. This IS a creation path, so it
        // must be checked explicitly, same as AuthService.RegisterAsync.
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new BusinessException("Password is required.");
        }

        if (await _userRepository.ExistsByEmailAsync(request.Email, ct))
        {
            throw new BusinessException("Email already exists.");
        }

        if (!string.IsNullOrEmpty(request.Phone) && await _userRepository.ExistsByPhoneAsync(request.Phone, ct))
        {
            throw new BusinessException("Phone number already exists.");
        }

        var now = DateTime.UtcNow;

        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            Gender = request.Gender,
            Dob = request.Dob,
            Role = Role.CUSTOMER,
            IsEmcardMember = false,
            EmcardPoints = 0,
            Password = _passwordHasher.Hash(request.Password),
            CreatedAt = now,
            UpdatedAt = now
        };

        var saved = await _userRepository.AddAsync(user, ct);
        await _userRepository.SaveChangesAsync(ct);

        return _mapper.Map<UserResponseDTO>(saved);
    }

    public async Task<IReadOnlyList<UserResponseDTO>> GetAllUsersAsync(CancellationToken ct = default)
    {
        var users = await _userRepository.GetAllAsync(ct);
        return users.Select(u => _mapper.Map<UserResponseDTO>(u)).ToList();
    }

    public async Task<UserResponseDTO> GetUserByIdAsync(long userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
            ?? throw new BusinessException($"User not found with ID : {userId}");

        return _mapper.Map<UserResponseDTO>(user);
    }

    public async Task<UserResponseDTO> UpdateUserAsync(long userId, UserRequestDTO request, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
            ?? throw new BusinessException($"User not found with ID : {userId}");

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Email = request.Email;
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.Password = _passwordHasher.Hash(request.Password);
        }
        user.Phone = request.Phone;
        user.Address = request.Address;
        user.Gender = request.Gender;
        user.Dob = request.Dob;
        user.UpdatedAt = DateTime.UtcNow;

        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync(ct);

        return _mapper.Map<UserResponseDTO>(user);
    }

    public async Task DeleteUserAsync(long userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
            ?? throw new BusinessException($"User not found with ID : {userId}");

        _userRepository.Remove(user);
        await _userRepository.SaveChangesAsync(ct);
    }
}
