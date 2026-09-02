using System.Text.Json;
using Emart.Api.Middleware;
using Emart.Application.Common.Exceptions;
using Emart.Application.Dtos;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;

namespace Emart.UnitTests.Api;

[TestFixture]
public class GlobalExceptionMiddlewareTests
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static async Task<(int StatusCode, ErrorResponse Body)> InvokeAsync(Exception toThrow)
    {
        var middleware = new GlobalExceptionMiddleware(_ => throw toThrow, NullLogger<GlobalExceptionMiddleware>.Instance);

        var context = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().BuildServiceProvider()
        };
        context.Request.Path = "/api/test";
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await JsonSerializer.DeserializeAsync<ErrorResponse>(context.Response.Body, JsonOptions);

        return (context.Response.StatusCode, body!);
    }

    [Test]
    public async Task ResourceNotFoundException_Maps404()
    {
        var (status, body) = await InvokeAsync(new ResourceNotFoundException("Product not found with id: 5"));

        status.Should().Be(404);
        body.Message.Should().Be("Product not found with id: 5");
    }

    [Test]
    public async Task AuthenticationFailedException_Maps401()
    {
        var (status, body) = await InvokeAsync(new AuthenticationFailedException());

        status.Should().Be(401);
        body.Message.Should().Be("Invalid email or password.");
    }

    [Test]
    public async Task InsufficientPointsException_Maps400()
    {
        var (status, body) = await InvokeAsync(new InsufficientPointsException("You do not have enough eMCard points."));

        status.Should().Be(400);
        body.Message.Should().Contain("eMCard points");
    }

    [Test]
    public async Task BusinessException_Maps400WithMessageVerbatim()
    {
        var (status, body) = await InvokeAsync(new BusinessException("Email already exists."));

        status.Should().Be(400);
        body.Message.Should().Be("Email already exists.");
    }

    [Test]
    public async Task ArgumentException_Maps400()
    {
        var (status, _) = await InvokeAsync(new ArgumentException("Invalid delivery option: FOO"));

        status.Should().Be(400);
    }

    [Test]
    public async Task InvalidOperationException_Maps400()
    {
        var (status, body) = await InvokeAsync(new InvalidOperationException("Your cart is empty."));

        status.Should().Be(400);
        body.Message.Should().Be("Your cart is empty.");
    }

    [Test]
    public async Task DbUpdateException_Maps400WithFriendlyMessage()
    {
        var (status, body) = await InvokeAsync(new DbUpdateException("save failed", new Exception("Duplicate entry")));

        status.Should().Be(400);
        body.Message.Should().Contain("database error");
    }

    [Test]
    public async Task UnhandledException_Maps500()
    {
        var (status, body) = await InvokeAsync(new Exception("boom"));

        status.Should().Be(500);
        body.Message.Should().Contain("An unexpected error occurred");
    }

    [Test]
    public async Task ErrorResponse_AlwaysIncludesPathAndTimestamp()
    {
        var (_, body) = await InvokeAsync(new ResourceNotFoundException("x"));

        body.Path.Should().Be("/api/test");
        body.Timestamp.Should().NotBe(default(DateTime));
    }
}
