using System.Security.Cryptography;
using Emart.Application.Common.Exceptions;
using Emart.Application.Dtos;
using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Emart.Domain.Enums;

namespace Emart.Application.Services;

public class AuthService : IAuthService
{
    // OTP is a 6-digit code, valid for 10 minutes from issue.
    private const int OtpValidMinutes = 10;

    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmcardAccountRepository _emcardAccountRepository;
    private readonly IEmcardTransactionRepository _emcardTransactionRepository;
    private readonly IEmailService _emailService;
    private readonly IPasswordResetOtpRepository _passwordResetOtpRepository;

    public AuthService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IEmcardAccountRepository emcardAccountRepository,
        IEmcardTransactionRepository emcardTransactionRepository,
        IEmailService emailService,
        IPasswordResetOtpRepository passwordResetOtpRepository)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _emcardAccountRepository = emcardAccountRepository;
        _emcardTransactionRepository = emcardTransactionRepository;
        _emailService = emailService;
        _passwordResetOtpRepository = passwordResetOtpRepository;
    }

    public async Task<UserResponseDTO> RegisterAsync(UserRequestDTO request, CancellationToken ct = default)
    {
        // UserRequestDTO is shared with UpdateUserAsync, where a blank password means "leave it
        // unchanged" - so the shared validator can't require it unconditionally. Registration is
        // the one path that must actually reject a missing password, checked here instead.
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new BusinessException("Password is required.");
        }

        if (await _userRepository.FindByEmailAsync(request.Email, ct) is not null)
        {
            throw new BusinessException("Email already exists.");
        }

        var now = DateTime.UtcNow;

        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Password = _passwordHasher.Hash(request.Password),
            Phone = request.Phone,
            Address = request.Address,
            Gender = request.Gender,
            Dob = request.Dob,
            Role = Role.CUSTOMER,
            IsEmcardMember = request.IsEmcardMember,
            EmcardPoints = request.IsEmcardMember ? 100 : 0,
            CreatedAt = now,
            UpdatedAt = now
        };

        var savedUser = await _userRepository.AddAsync(user, ct);
        await _userRepository.SaveChangesAsync(ct);

        // Wires the eMCard redemption ledger (EmcardAccount) to real user registration.
        // EmcardAccount.TotalPoints becomes the authoritative redeemable balance checked by
        // EmcardService; user.EmcardPoints above is left untouched for backward compatibility
        // with existing profile/registration display.
        if (savedUser.IsEmcardMember)
        {
            await _emcardAccountRepository.AddAsync(new EmcardAccount(savedUser.UserId, savedUser.EmcardPoints), ct);

            // Open the points ledger with the joining credit, so the customer's history starts
            // from a real record instead of an unexplained opening balance.
            await _emcardTransactionRepository.AddAsync(
                new EmcardTransaction(savedUser.UserId, null, EmcardTransactionType.CREDIT_INITIAL, savedUser.EmcardPoints, 0, savedUser.EmcardPoints),
                ct);

            await _emcardAccountRepository.SaveChangesAsync(ct);
        }

        // Registration is fully committed at this point - safe to fire the welcome email now.
        await _emailService.SendWelcomeEmailAsync(savedUser.Email, savedUser.FirstName, ct);

        return new UserResponseDTO
        {
            UserId = savedUser.UserId,
            FirstName = savedUser.FirstName,
            LastName = savedUser.LastName,
            Email = savedUser.Email,
            Phone = savedUser.Phone,
            Address = savedUser.Address,
            Gender = savedUser.Gender,
            Dob = savedUser.Dob,
            Role = savedUser.Role,
            IsEmcardMember = savedUser.IsEmcardMember,
            EmcardPoints = savedUser.EmcardPoints,
            CreatedAt = savedUser.CreatedAt
        };
    }

    public async Task<LoginResponseDTO> LoginAsync(LoginRequestDTO request, CancellationToken ct = default)
    {
        var user = await _userRepository.FindByEmailAsync(request.Email, ct);

        if (user is null || user.Password is null || !_passwordHasher.Verify(request.Password, user.Password))
        {
            throw new AuthenticationFailedException();
        }

        var token = _jwtTokenService.GenerateToken(user.Email);

        return new LoginResponseDTO
        {
            Token = token,
            Type = "Bearer",
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsEmcardMember = user.IsEmcardMember
        };
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequestDTO request, CancellationToken ct = default)
    {
        var user = await _userRepository.FindByEmailAsync(request.Email, ct)
            ?? throw new BusinessException("No account found with this email.");

        // Invalidate any OTP(s) already issued for this email - only the newest one should ever be usable.
        await _passwordResetOtpRepository.DeleteByEmailAsync(user.Email, ct);

        var otp = GenerateOtp();

        var resetOtp = new PasswordResetOtp(user.Email, _passwordHasher.Hash(otp), DateTime.UtcNow.AddMinutes(OtpValidMinutes));

        await _passwordResetOtpRepository.AddAsync(resetOtp, ct);
        await _passwordResetOtpRepository.SaveChangesAsync(ct);

        await _emailService.SendPasswordResetOtpEmailAsync(user.Email, user.FirstName, otp, ct);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequestDTO request, CancellationToken ct = default)
    {
        var user = await _userRepository.FindByEmailAsync(request.Email, ct)
            ?? throw new BusinessException("No account found with this email.");

        var resetOtp = await _passwordResetOtpRepository.FindTopByEmailOrderByCreatedAtDescAsync(user.Email, ct)
            ?? throw new BusinessException("No OTP request found. Please request a new OTP.");

        if (resetOtp.Used)
        {
            throw new BusinessException("This OTP has already been used. Please request a new one.");
        }

        if (resetOtp.ExpiryTime < DateTime.UtcNow)
        {
            throw new BusinessException("OTP has expired. Please request a new one.");
        }

        if (string.IsNullOrEmpty(request.Otp) || !_passwordHasher.Verify(request.Otp, resetOtp.OtpHash))
        {
            throw new BusinessException("Invalid OTP.");
        }

        user.Password = _passwordHasher.Hash(request.NewPassword);
        _userRepository.Update(user);

        // Single-use: mark it spent so it cannot be replayed.
        resetOtp.Used = true;
        _passwordResetOtpRepository.Update(resetOtp);

        await _userRepository.SaveChangesAsync(ct);
    }

    private static string GenerateOtp() => RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
}
