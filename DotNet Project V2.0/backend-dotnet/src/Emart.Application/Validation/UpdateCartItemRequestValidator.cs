using Emart.Application.Dtos;
using FluentValidation;

namespace Emart.Application.Validation;

public class UpdateCartItemRequestValidator : AbstractValidator<UpdateCartItemRequestDTO>
{
    public UpdateCartItemRequestValidator()
    {
        RuleFor(x => x.Quantity).NotNull().WithMessage("Quantity is required");
        RuleFor(x => x.Quantity!.Value).GreaterThanOrEqualTo(0).WithMessage("Quantity cannot be negative").When(x => x.Quantity is not null);
    }
}
