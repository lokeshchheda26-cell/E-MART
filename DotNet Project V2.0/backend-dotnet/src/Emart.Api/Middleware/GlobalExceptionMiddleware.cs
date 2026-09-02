using Emart.Application.Common.Exceptions;
using Emart.Application.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Emart.Api.Middleware;

/// <summary>
/// Centralized exception handling for all endpoints, producing the same ErrorResponse JSON shape
/// (timestamp/status/error/message/path/validationErrors?) and status-code precedence as the Java
/// GlobalExceptionHandler.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ResourceNotFoundException ex)
        {
            await WriteAsync(context, StatusCodes.Status404NotFound, ex.Message);
        }
        catch (AuthenticationFailedException ex)
        {
            await WriteAsync(context, StatusCodes.Status401Unauthorized, ex.Message);
        }
        catch (DbUpdateException ex)
        {
            // Almost always a schema mismatch or constraint violation - log the full exception at
            // ERROR (unlike every other handler here) and surface the root cause explicitly.
            var detail = ex.InnerException?.Message ?? ex.Message;
            _logger.LogError(ex, "Database error on {Path} : {Detail}", context.Request.Path, detail);

            var friendly = ex is DbUpdateConcurrencyException
                ? $"This action couldn't be saved because of a data conflict: {detail}"
                : $"A database error occurred: {detail}";

            await WriteAsync(context, StatusCodes.Status400BadRequest, friendly);
        }
        catch (InsufficientPointsException ex)
        {
            _logger.LogWarning("EMCard points rejected on {Path} : {Message}", context.Request.Path, ex.Message);
            await WriteAsync(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (BusinessException ex)
        {
            _logger.LogWarning("Business rule rejected request on {Path} : {Message}", context.Request.Path, ex.Message);
            await WriteAsync(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (ArgumentException ex)
        {
            await WriteAsync(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Unhandled business error on {Path} : {Message}", context.Request.Path, ex.Message);
            await WriteAsync(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error on {Path}", context.Request.Path);
            await WriteAsync(context, StatusCodes.Status500InternalServerError, $"An unexpected error occurred: {ex.Message}");
        }
    }

    private static Task WriteAsync(HttpContext context, int statusCode, string message, Dictionary<string, string>? validationErrors = null)
    {
        var response = new ErrorResponse
        {
            Timestamp = DateTime.UtcNow,
            Status = statusCode,
            Error = ReasonPhrase(statusCode),
            Message = message,
            Path = context.Request.Path,
            ValidationErrors = validationErrors
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;
        return context.Response.WriteAsJsonAsync(response);
    }

    private static string ReasonPhrase(int statusCode) => statusCode switch
    {
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        500 => "Internal Server Error",
        _ => "Error"
    };
}
