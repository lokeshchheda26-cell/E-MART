using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Emart.Api.Auth;
using Emart.Api.Middleware;
using Emart.Application.Common.Options;
using Emart.Application.Dtos;
using Emart.Application.Extensions;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Purchase;
using Emart.Infrastructure.Extensions;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEmartInfrastructure(builder.Configuration);
builder.Services.AddEmartApplication();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Matches Jackson's default output shape, so the frontend (already built against the
        // Java backend) keeps working unmodified: camelCase property names, enums as their
        // literal name string.
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddFluentValidationAutoValidation();

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    // Reproduces GlobalExceptionHandler's MethodArgumentNotValidException shape exactly, instead
    // of ASP.NET's default ValidationProblemDetails body.
    options.InvalidModelStateResponseFactory = context =>
    {
        var validationErrors = context.ModelState
            .Where(kvp => kvp.Value?.Errors.Count > 0)
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value!.Errors[0].ErrorMessage);

        var response = new ErrorResponse
        {
            Timestamp = DateTime.UtcNow,
            Status = StatusCodes.Status400BadRequest,
            Error = "Bad Request",
            Message = "Validation failed for one or more fields",
            Path = context.HttpContext.Request.Path,
            ValidationErrors = validationErrors
        };

        return new BadRequestObjectResult(response);
    };
});

builder.Services.AddCors(options =>
{
    // AuthController/UserController pin CORS to the exact Vite dev origin; every other
    // controller allows any origin - both mirrored from the Java @CrossOrigin annotations.
    options.AddPolicy("Frontend", policy => policy.WithOrigins("http://localhost:5173").AllowAnyMethod().AllowAnyHeader());
    options.AddPolicy("AnyOrigin", policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("Missing Jwt configuration.");
var googleSettings = builder.Configuration.GetSection(GoogleOAuthSettings.SectionName).Get<GoogleOAuthSettings>()
    ?? throw new InvalidOperationException("Missing GoogleOAuth configuration.");

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultSignInScheme = "External";
    })
    // Transient cookie used only to survive the Google redirect round-trip - never issued as the
    // app's actual session, which stays JWT-only/stateless (matching Java's STATELESS policy).
    .AddCookie("External")
    .AddJwtBearer(options =>
    {
        // Keep claim types exactly as issued ("sub", not the legacy ClaimTypes.NameIdentifier
        // XML/SOAP URI JwtSecurityTokenHandler maps them to by default) - JwtBearerEventsSetup
        // reads JwtRegisteredClaimNames.Sub directly.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
        };
        options.Events = JwtBearerEventsSetup.Create();
    })
    .AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
    {
        options.ClientId = googleSettings.ClientId;
        options.ClientSecret = googleSettings.ClientSecret;
        options.SignInScheme = "External";
        options.CallbackPath = "/login/oauth2/code/google";
        options.Scope.Add("email");
        options.Scope.Add("profile");

        options.Events.OnTicketReceived = async context =>
        {
            var email = context.Principal?.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrWhiteSpace(email))
            {
                context.Fail("Google account did not return an email address");
                return;
            }

            var firstName = context.Principal?.FindFirstValue(ClaimTypes.GivenName) ?? "Google";
            var lastName = context.Principal?.FindFirstValue(ClaimTypes.Surname) ?? "User";

            var linker = context.HttpContext.RequestServices.GetRequiredService<IGoogleAccountLinker>();
            var jwtService = context.HttpContext.RequestServices.GetRequiredService<IJwtTokenService>();

            var user = await linker.LinkOrCreateAsync(email, firstName, lastName, context.HttpContext.RequestAborted);
            var token = jwtService.GenerateToken(user.Email);

            var targetUrl = QueryHelpers.AddQueryString(googleSettings.RedirectUri, new Dictionary<string, string?>
            {
                ["token"] = token,
                ["type"] = "Bearer"
            });

            context.Response.Redirect(targetUrl);
            context.HandleResponse();
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Emart API", Version = "v1" });

    var jwtScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };

    options.AddSecurityDefinition("Bearer", jwtScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement { { jwtScheme, Array.Empty<string>() } });
});

var app = builder.Build();

// Matches the Java prod profile's ${DB_URL}-style "no fallback" properties: production must
// supply every secret via environment variables (ConnectionStrings__EmartDb, Jwt__SecretKey,
// GoogleOAuth__ClientId/__ClientSecret, Razorpay__ApiKey/__ApiSecret) or fail at startup, rather
// than silently falling back to values meant for local development only.
if (app.Environment.IsProduction())
{
    var required = new (string Key, string? Value)[]
    {
        ("ConnectionStrings:EmartDb", app.Configuration.GetConnectionString("EmartDb")),
        ("Jwt:SecretKey", app.Configuration["Jwt:SecretKey"]),
        ("GoogleOAuth:ClientId", app.Configuration["GoogleOAuth:ClientId"]),
        ("GoogleOAuth:ClientSecret", app.Configuration["GoogleOAuth:ClientSecret"]),
        ("Razorpay:ApiKey", app.Configuration["Razorpay:ApiKey"]),
        ("Razorpay:ApiSecret", app.Configuration["Razorpay:ApiSecret"])
    };

    var missing = required.Where(r => string.IsNullOrWhiteSpace(r.Value)).Select(r => r.Key).ToList();
    if (missing.Count > 0)
    {
        throw new InvalidOperationException(
            $"Missing required production configuration: {string.Join(", ", missing)}. Set these via environment variables.");
    }
}

// Fail fast at startup if a purchase mode is missing/duplicated a strategy - mirrors
// PurchaseModeRegistry's Spring @Component constructor-time check running as soon as the
// container is built, rather than waiting for the first pricing request.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<PurchaseModeRegistry>();
}

app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Entry point for the Google login flow (matches Spring Security's default
// /oauth2/authorization/{registrationId} path the frontend's VITE_OAUTH_BASE_URL link targets).
app.MapGet("/oauth2/authorization/google", (HttpContext context) =>
    Results.Challenge(new Microsoft.AspNetCore.Authentication.AuthenticationProperties(), [GoogleDefaults.AuthenticationScheme]));

app.Run();
