using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

// SecurityConfig: GET /api/users -> ADMIN, DELETE /api/users/** -> ADMIN, everything else under
// /api/users/** (including POST create and PUT update) -> any authenticated user.
[ApiController]
[Route("api/users")]
[EnableCors("Frontend")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost]
    public async Task<ActionResult<UserResponseDTO>> CreateUser([FromBody] UserRequestDTO request, CancellationToken ct) =>
        Ok(await _userService.SaveUserAsync(request, ct));

    [HttpGet]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IReadOnlyList<UserResponseDTO>>> GetAllUsers(CancellationToken ct) =>
        Ok(await _userService.GetAllUsersAsync(ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<UserResponseDTO>> GetUserById(long id, CancellationToken ct) =>
        Ok(await _userService.GetUserByIdAsync(id, ct));

    [HttpPut("{id:long}")]
    public async Task<ActionResult<UserResponseDTO>> UpdateUser(long id, [FromBody] UserRequestDTO request, CancellationToken ct) =>
        Ok(await _userService.UpdateUserAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<string>> DeleteUser(long id, CancellationToken ct)
    {
        await _userService.DeleteUserAsync(id, ct);
        return Ok("User deleted successfully.");
    }
}
