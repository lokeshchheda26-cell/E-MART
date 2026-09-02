namespace Emart.Application.Common.Exceptions;

/// <summary>
/// A business-rule rejection the customer can act on (e.g. "Email already exists.", "User not
/// found"). Mirrors the many plain `new RuntimeException("...")` throws scattered through the
/// Java service layer, all of which the GlobalExceptionHandler's catch-all resolves to 400 -
/// preserved here as a single deliberate type rather than reusing a generic .NET exception, but
/// mapped to the same 400 status for wire compatibility.
/// </summary>
public class BusinessException : Exception
{
    public BusinessException(string message) : base(message)
    {
    }
}
