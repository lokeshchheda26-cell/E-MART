using Emart.Application.Services.Interfaces;

namespace Emart.Infrastructure.Auth;

/// <summary>BCrypt password hashing, matching the Java BCryptPasswordEncoder bean.</summary>
public class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string rawPassword) => BCrypt.Net.BCrypt.HashPassword(rawPassword);

    public bool Verify(string rawPassword, string hashedPassword) => BCrypt.Net.BCrypt.Verify(rawPassword, hashedPassword);
}
