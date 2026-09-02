using Emart.Api.Auth;
using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableCors("Frontend")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Register a new customer. POST /api/auth/register</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponseDTO>> Register([FromBody] UserRequestDTO request, CancellationToken ct)
    {
        var response = await _authService.RegisterAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    /// <summary>Login. POST /api/auth/login</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDTO>> Login([FromBody] LoginRequestDTO request, CancellationToken ct)
    {
        var response = await _authService.LoginAsync(request, ct);
        return Ok(response);
    }

    /// <summary>
    /// Current logged-in user's info. Works for both normal login and Google login, since both
    /// produce the same JWT format. GET /api/auth/me
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public ActionResult<LoginResponseDTO> Me()
    {
        var user = User;

        var response = new LoginResponseDTO
        {
            UserId = user.GetUserId() ?? 0,
            FirstName = user.GetFirstName() ?? "",
            LastName = user.GetLastName() ?? "",
            Email = user.GetEmail() ?? "",
            Role = user.GetRole() ?? "",
            IsEmcardMember = user.IsEmcardMember()
        };

        return Ok(response);
    }

    /// <summary>Step 1 of forgot-password: send an OTP to the account's email. POST /api/auth/forgot-password</summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<Dictionary<string, string>>> ForgotPassword([FromBody] ForgotPasswordRequestDTO request, CancellationToken ct)
    {
        await _authService.ForgotPasswordAsync(request, ct);
        return Ok(new Dictionary<string, string> { ["message"] = "An OTP has been sent to your email address." });
    }

    /// <summary>Step 2 of forgot-password: verify the OTP and set a new password. POST /api/auth/reset-password</summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult<Dictionary<string, string>>> ResetPassword([FromBody] ResetPasswordRequestDTO request, CancellationToken ct)
    {
        await _authService.ResetPasswordAsync(request, ct);
        return Ok(new Dictionary<string, string> { ["message"] = "Your password has been reset successfully." });
    }
}
