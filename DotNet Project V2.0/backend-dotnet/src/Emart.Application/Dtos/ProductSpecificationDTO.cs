namespace Emart.Application.Dtos;

public class ProductSpecificationDTO
{
    public string ConfigName { get; set; } = null!;
    public string ConfigValue { get; set; } = null!;

    public ProductSpecificationDTO()
    {
    }

    public ProductSpecificationDTO(string configName, string configValue)
    {
        ConfigName = configName;
        ConfigValue = configValue;
    }
}
