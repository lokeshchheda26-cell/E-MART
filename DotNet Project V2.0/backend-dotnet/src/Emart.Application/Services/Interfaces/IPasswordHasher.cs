namespace Emart.Application.Services.Interfaces;

public interface IPasswordHasher
{
    string Hash(string rawPassword);

    bool Verify(string rawPassword, string hashedPassword);
}
