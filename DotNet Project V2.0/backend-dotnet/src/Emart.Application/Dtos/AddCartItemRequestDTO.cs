namespace Emart.Application.Dtos;

public class AddCartItemRequestDTO
{
    public long? ProductId { get; set; }

    public int Quantity { get; set; } = 1;
}
