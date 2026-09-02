using Emart.Application.Dtos;

namespace Emart.Application.Services.Interfaces;

public interface IAuthService
{
    Task<UserResponseDTO> RegisterAsync(UserRequestDTO request, CancellationToken ct = default);

    Task<LoginResponseDTO> LoginAsync(LoginRequestDTO request, CancellationToken ct = default);

    Task ForgotPasswordAsync(ForgotPasswordRequestDTO request, CancellationToken ct = default);

    Task ResetPasswordAsync(ResetPasswordRequestDTO request, CancellationToken ct = default);
}
