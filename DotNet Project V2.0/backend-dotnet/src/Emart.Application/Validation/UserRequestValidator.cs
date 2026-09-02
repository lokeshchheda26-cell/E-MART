using Emart.Application.Dtos;
using FluentValidation;

namespace Emart.Application.Validation;

/// <summary>
/// The Java UserRequestDTO carries NO bean-validation annotations at all - an empty/missing
/// first name, last name, or email currently only fails downstream as a NOT NULL constraint
/// violation (a generic "database error" 400). This validator enforces the same required fields
/// the `users` table columns already demand, so the same invalid input now fails fast with a
/// clear field-level message instead of a raw DB error - a deliberate, low-risk improvement
/// (the successful path is unchanged) called out explicitly rather than left as a silent gap.
/// </summary>
public class UserRequestValidator : AbstractValidator<UserRequestDTO>
{
    public UserRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(100);
        // Not required here: this DTO is shared with UpdateUserAsync, where a blank password
        // means "leave it unchanged". Registration enforces its own non-empty check
        // (AuthService.RegisterAsync) since that is the one path where it's mandatory.
        RuleFor(x => x.Phone).MaximumLength(15);
    }
}
