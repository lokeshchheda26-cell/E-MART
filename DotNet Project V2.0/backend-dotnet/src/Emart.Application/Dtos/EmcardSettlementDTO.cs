namespace Emart.Application.Dtos;

public class EmcardSettlementDTO
{
    public int PointsRedeemed { get; set; }
    public int PointsEarned { get; set; }
    public int TotalPointsBefore { get; set; }
    public int TotalPointsAfter { get; set; }

    public EmcardSettlementDTO()
    {
    }

    public EmcardSettlementDTO(int pointsRedeemed, int pointsEarned, int totalPointsBefore, int totalPointsAfter)
    {
        PointsRedeemed = pointsRedeemed;
        PointsEarned = pointsEarned;
        TotalPointsBefore = totalPointsBefore;
        TotalPointsAfter = totalPointsAfter;
    }
}
