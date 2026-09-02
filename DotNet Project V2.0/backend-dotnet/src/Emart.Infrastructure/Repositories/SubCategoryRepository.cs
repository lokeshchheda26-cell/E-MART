using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class SubCategoryRepository : GenericRepository<SubCategory>, ISubCategoryRepository
{
    public SubCategoryRepository(EmartDbContext context) : base(context)
    {
    }

    private IQueryable<SubCategory> WithCategory() => Set.Include(sc => sc.Category);

    public override async Task<SubCategory?> GetByIdAsync(object id, CancellationToken ct = default) =>
        await WithCategory().FirstOrDefaultAsync(sc => sc.SubcatMasterId == (int)id, ct);

    public override async Task<IReadOnlyList<SubCategory>> GetAllAsync(CancellationToken ct = default) =>
        await WithCategory().AsNoTracking().ToListAsync(ct);

    public async Task<IReadOnlyList<SubCategory>> FindByCategoryIdAsync(int catmasterId, CancellationToken ct = default) =>
        await WithCategory().AsNoTracking().Where(sc => sc.CatmasterId == catmasterId).ToListAsync(ct);
}
