using Emart.Application.Dtos;
using FluentValidation;

namespace Emart.Application.Validation;

public class PaymentVerificationRequestValidator : AbstractValidator<PaymentVerificationRequestDTO>
{
    public PaymentVerificationRequestValidator()
    {
        RuleFor(x => x.RazorpayOrderId).NotEmpty().WithMessage("razorpayOrderId is required");
        RuleFor(x => x.RazorpayPaymentId).NotEmpty().WithMessage("razorpayPaymentId is required");
        RuleFor(x => x.RazorpaySignature).NotEmpty().WithMessage("razorpaySignature is required");
    }
}
