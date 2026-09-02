using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Emart.Application.Common.Options;
using Emart.Infrastructure.Auth;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NUnit.Framework;

namespace Emart.UnitTests.Auth;

[TestFixture]
public class JwtTokenServiceTests
{
    private JwtTokenService _service = null!;

    [SetUp]
    public void SetUp()
    {
        var settings = new JwtSettings { SecretKey = "unit-test-secret-key-at-least-32-bytes-long", ExpirationHours = 24 };
        _service = new JwtTokenService(Options.Create(settings));
    }

    [Test]
    public void GenerateToken_CarriesEmailAsSubject()
    {
        var token = _service.GenerateToken("user@example.com");

        _service.ExtractEmail(token).Should().Be("user@example.com");
    }

    [Test]
    public void GenerateToken_IsNotExpiredImmediately()
    {
        var token = _service.GenerateToken("user@example.com");

        _service.IsTokenExpired(token).Should().BeFalse();
    }

    [Test]
    public void IsTokenValid_TrueForMatchingEmail()
    {
        var token = _service.GenerateToken("user@example.com");

        _service.IsTokenValid(token, "user@example.com").Should().BeTrue();
    }

    [Test]
    public void IsTokenValid_FalseForDifferentEmail()
    {
        var token = _service.GenerateToken("user@example.com");

        _service.IsTokenValid(token, "someone-else@example.com").Should().BeFalse();
    }

    [Test]
    public void ExpiredToken_IsRejected()
    {
        const string secret = "unit-test-secret-key-at-least-32-bytes-long";

        // Built directly (rather than via GenerateToken, which always issues a token valid from
        // "now") with both NotBefore and Expires safely in the past, so the token is well-formed
        // but already expired.
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var expired = new JwtSecurityToken(
            claims: new[] { new Claim(JwtRegisteredClaimNames.Sub, "user@example.com") },
            notBefore: DateTime.UtcNow.AddHours(-2),
            expires: DateTime.UtcNow.AddHours(-1),
            signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256));
        var token = new JwtSecurityTokenHandler().WriteToken(expired);

        var expiredService = new JwtTokenService(Options.Create(new JwtSettings { SecretKey = secret, ExpirationHours = 24 }));

        expiredService.IsTokenExpired(token).Should().BeTrue();
        expiredService.IsTokenValid(token, "user@example.com").Should().BeFalse();
    }

    [Test]
    public void MalformedToken_IsRejectedNotThrown()
    {
        _service.ExtractEmail("not-a-real-token").Should().BeNull();
        _service.IsTokenExpired("not-a-real-token").Should().BeTrue();
    }

    [Test]
    public void TokenSignedWithDifferentSecret_IsRejected()
    {
        var otherSettings = new JwtSettings { SecretKey = "a-completely-different-secret-key-32-bytes", ExpirationHours = 24 };
        var otherService = new JwtTokenService(Options.Create(otherSettings));

        var token = otherService.GenerateToken("user@example.com");

        _service.ExtractEmail(token).Should().BeNull();
    }
}
