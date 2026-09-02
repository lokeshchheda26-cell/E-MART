using Emart.Application.Dtos;
using FluentValidation;

namespace Emart.Application.Validation;

public class AddCartItemRequestValidator : AbstractValidator<AddCartItemRequestDTO>
{
    public AddCartItemRequestValidator()
    {
        RuleFor(x => x.ProductId).NotNull().WithMessage("Product id is required");
        RuleFor(x => x.Quantity).GreaterThanOrEqualTo(1).WithMessage("Quantity must be at least 1");
    }
}
