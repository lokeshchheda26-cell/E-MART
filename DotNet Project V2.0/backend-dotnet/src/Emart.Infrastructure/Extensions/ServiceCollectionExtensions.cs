using Emart.Application.Common.Options;
using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Emart.Infrastructure.Auth;
using Emart.Infrastructure.Data;
using Emart.Infrastructure.External;
using Emart.Infrastructure.Repositories;
using Emart.Infrastructure.Startup;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Emart.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddEmartInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("EmartDb")
            ?? throw new InvalidOperationException("Missing ConnectionStrings:EmartDb configuration.");

        services.AddDbContext<EmartDbContext>(options =>
            options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 46))));

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<LoyaltySettings>(configuration.GetSection(LoyaltySettings.SectionName));
        services.Configure<SaleBootstrapSettings>(configuration.GetSection(SaleBootstrapSettings.SectionName));
        services.Configure<PriceRoundingSettings>(configuration.GetSection(PriceRoundingSettings.SectionName));
        services.Configure<RazorpaySettings>(configuration.GetSection(RazorpaySettings.SectionName));
        services.Configure<MailSettings>(configuration.GetSection(MailSettings.SectionName));
        services.Configure<GoogleOAuthSettings>(configuration.GetSection(GoogleOAuthSettings.SectionName));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IEmcardAccountRepository, EmcardAccountRepository>();
        services.AddScoped<IEmcardReservationRepository, EmcardReservationRepository>();
        services.AddScoped<IEmcardTransactionRepository, EmcardTransactionRepository>();
        services.AddScoped<ICartRepository, CartRepository>();
        services.AddScoped<ICartItemRepository, CartItemRepository>();
        services.AddScoped<IOrdersRepository, OrdersRepository>();
        services.AddScoped<IOrderItemRepository, OrderItemRepository>();
        services.AddScoped<IPasswordResetOtpRepository, PasswordResetOtpRepository>();
        services.AddScoped<IProductImageRepository, ProductImageRepository>();
        services.AddScoped<IProductSpecificationRepository, ProductSpecificationRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ISubCategoryRepository, SubCategoryRepository>();

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<IGoogleAccountLinker, GoogleAccountLinker>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IPdfInvoiceService, PdfInvoiceService>();
        services.AddHttpClient<IRazorpayService, RazorpayService>();

        services.AddHostedService<BrandBackfillHostedService>();
        services.AddHostedService<OfferTypeBackfillHostedService>();
        services.AddHostedService<SaleBackfillHostedService>();
        services.AddHostedService<PriceRoundingBackfillHostedService>();
        services.AddHostedService<StockBackfillHostedService>();

        return services;
    }
}
