namespace Emart.Application.Common.Exceptions;

/// <summary>Bad email/password on login. Mapped to HTTP 401, generic message (never reveals which field was wrong).</summary>
public class AuthenticationFailedException : Exception
{
    public AuthenticationFailedException() : base("Invalid email or password.")
    {
    }
}
