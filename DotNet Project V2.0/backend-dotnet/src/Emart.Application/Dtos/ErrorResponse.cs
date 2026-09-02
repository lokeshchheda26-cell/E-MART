namespace Emart.Application.Dtos;

/// <summary>Standard error payload returned to the client whenever a request fails.</summary>
public class ErrorResponse
{
    public DateTime Timestamp { get; set; }
    public int Status { get; set; }
    public string Error { get; set; } = null!;
    public string Message { get; set; } = null!;
    public string Path { get; set; } = null!;
    public Dictionary<string, string>? ValidationErrors { get; set; }
}
