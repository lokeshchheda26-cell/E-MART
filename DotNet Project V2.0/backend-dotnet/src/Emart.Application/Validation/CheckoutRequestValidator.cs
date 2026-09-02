using Emart.Application.Dtos;
using FluentValidation;

namespace Emart.Application.Validation;

public class CheckoutRequestValidator : AbstractValidator<CheckoutRequestDTO>
{
    public CheckoutRequestValidator()
    {
        RuleFor(x => x.DeliveryOption).NotEmpty().WithMessage("Delivery option is required");
    }
}
