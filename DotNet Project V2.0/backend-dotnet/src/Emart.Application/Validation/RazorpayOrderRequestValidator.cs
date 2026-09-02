using Emart.Application.Dtos;
using FluentValidation;

namespace Emart.Application.Validation;

public class RazorpayOrderRequestValidator : AbstractValidator<RazorpayOrderRequestDTO>
{
    public RazorpayOrderRequestValidator()
    {
        RuleFor(x => x.Amount).NotNull().WithMessage("Amount is required");
        RuleFor(x => x.Amount!.Value).GreaterThan(0).WithMessage("Amount must be greater than zero").When(x => x.Amount is not null);
        RuleFor(x => x.Currency).NotEmpty().WithMessage("Currency is required");
        RuleFor(x => x.Receipt).NotEmpty().WithMessage("Receipt is required");
    }
}
