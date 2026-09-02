using Emart.Application.Common.Options;
using Emart.Application.Mapping;
using Emart.Application.Services;
using Emart.Application.Services.Interfaces;
using Emart.Application.Validation;
using Emart.Domain.Purchase;
using Emart.Domain.Purchase.Strategy;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Emart.Application.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddEmartApplication(this IServiceCollection services)
    {
        services.AddAutoMapper(cfg => { }, typeof(EmartMappingProfile).Assembly);

        services.AddValidatorsFromAssemblyContaining<CheckoutRequestValidator>();

        // ---- Purchase/pricing engine (Domain) ----
        services.AddSingleton<IPurchaseModeStrategy, CashOnlyStrategy>();
        services.AddSingleton<IPurchaseModeStrategy, EmcardDiscountStrategy>();
        services.AddSingleton<IPurchaseModeStrategy, FullRedemptionStrategy>();
        services.AddSingleton<IPurchaseModeStrategy, PartialRedemptionStrategy>();
        services.AddSingleton<PurchaseModeRegistry>();
        services.AddSingleton(sp => new LoyaltyPolicy(sp.GetRequiredService<IOptions<LoyaltySettings>>().Value.EarnRate));
        services.AddSingleton<PurchaseDecisionEngine>();

        // ---- Generic + business services ----
        services.AddScoped(typeof(IGenericService<>), typeof(GenericService<>));
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ISubCategoryService, SubCategoryService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICartService, CartService>();
        services.AddScoped<IEmcardService, EmcardService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IProductService, ProductService>();

        return services;
    }
}
