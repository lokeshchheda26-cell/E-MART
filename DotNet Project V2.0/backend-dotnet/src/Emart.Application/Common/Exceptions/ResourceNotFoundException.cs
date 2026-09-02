namespace Emart.Application.Common.Exceptions;

/// <summary>Thrown when a requested resource (e.g. a Product) does not exist. Mapped to HTTP 404.</summary>
public class ResourceNotFoundException : Exception
{
    public ResourceNotFoundException(string message) : base(message)
    {
    }
}
