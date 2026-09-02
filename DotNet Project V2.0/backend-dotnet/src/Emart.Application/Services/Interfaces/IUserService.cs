using Emart.Application.Dtos;

namespace Emart.Application.Services.Interfaces;

public interface IUserService
{
    Task<UserResponseDTO> SaveUserAsync(UserRequestDTO request, CancellationToken ct = default);

    Task<IReadOnlyList<UserResponseDTO>> GetAllUsersAsync(CancellationToken ct = default);

    Task<UserResponseDTO> GetUserByIdAsync(long userId, CancellationToken ct = default);

    Task<UserResponseDTO> UpdateUserAsync(long userId, UserRequestDTO request, CancellationToken ct = default);

    Task DeleteUserAsync(long userId, CancellationToken ct = default);
}
