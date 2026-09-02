namespace Emart.Application.Dtos;

public class EmcardStatusDTO
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public int TotalPoints { get; set; }
    public int ReservedPoints { get; set; }
    public int AvailablePoints { get; set; }
    public List<long> ReservedProductIds { get; set; } = new();

    public EmcardStatusDTO()
    {
    }

    public EmcardStatusDTO(bool success, string? message, int totalPoints, int reservedPoints, int availablePoints, List<long> reservedProductIds)
    {
        Success = success;
        Message = message;
        TotalPoints = totalPoints;
        ReservedPoints = reservedPoints;
        AvailablePoints = availablePoints;
        ReservedProductIds = reservedProductIds;
    }
}
