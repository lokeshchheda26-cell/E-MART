using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class CategoryRepository : GenericRepository<Category>, ICategoryRepository
{
    public CategoryRepository(EmartDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Category>> FindByCatIdAsync(string catId, CancellationToken ct = default) =>
        await Set.AsNoTracking().Where(c => c.CatId == catId).ToListAsync(ct);
}
