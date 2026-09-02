using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class CartItemRepository : GenericRepository<CartItem>, ICartItemRepository
{
    public CartItemRepository(EmartDbContext context) : base(context)
    {
    }

    private IQueryable<CartItem> WithProduct() => Set.Include(ci => ci.Product).ThenInclude(p => p.Category);

    public async Task<IReadOnlyList<CartItem>> FindByCartIdAsync(long cartId, CancellationToken ct = default) =>
        await WithProduct().Where(ci => ci.CartId == cartId).ToListAsync(ct);

    public Task<CartItem?> FindByCartIdAndProductIdAsync(long cartId, long productId, CancellationToken ct = default) =>
        WithProduct().FirstOrDefaultAsync(ci => ci.CartId == cartId && ci.ProductId == productId, ct);

    public Task<CartItem?> FindByCartItemIdAndCartIdAsync(long cartItemId, long cartId, CancellationToken ct = default) =>
        WithProduct().FirstOrDefaultAsync(ci => ci.CartItemId == cartItemId && ci.CartId == cartId, ct);

    public async Task DeleteByCartIdAsync(long cartId, CancellationToken ct = default) =>
        await Set.Where(ci => ci.CartId == cartId).ExecuteDeleteAsync(ct);
}
