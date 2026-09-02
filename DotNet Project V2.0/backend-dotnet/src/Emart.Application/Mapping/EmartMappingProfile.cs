using AutoMapper;
using Emart.Application.Dtos;
using Emart.Domain.Entities;

namespace Emart.Application.Mapping;

/// <summary>
/// AutoMapper profile for the entity&lt;-&gt;DTO pairs that are genuinely 1:1 field mappings
/// (User/EmcardTransaction). Most other response DTOs in this app (cart, order, product-details)
/// are assembled from business decision objects (LineDecision/CartDecision/ProductOffer) rather
/// than a plain entity - those stay hand-built in their services, exactly as the Java source does
/// its own manual mapping there, since AutoMapper would only obscure the business logic driving
/// each field rather than simplify it.
/// </summary>
public class EmartMappingProfile : Profile
{
    public EmartMappingProfile()
    {
        CreateMap<User, UserResponseDTO>();

        CreateMap<EmcardTransaction, EmcardTransactionResponseDTO>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.TxnType.ToString()));
    }
}
