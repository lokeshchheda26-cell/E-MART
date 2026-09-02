using Emart.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Data;

public class EmartDbContext : DbContext
{
    public EmartDbContext(DbContextOptions<EmartDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<SubCategory> SubCategories => Set<SubCategory>();
    public DbSet<Config> Configs => Set<Config>();
    public DbSet<ProductSpecification> ProductSpecifications => Set<ProductSpecification>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Orders> Orders => Set<Orders>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<EmcardAccount> EmcardAccounts => Set<EmcardAccount>();
    public DbSet<EmcardReservation> EmcardReservations => Set<EmcardReservation>();
    public DbSet<EmcardTransaction> EmcardTransactions => Set<EmcardTransaction>();
    public DbSet<PasswordResetOtp> PasswordResetOtps => Set<PasswordResetOtp>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Every enum is persisted as its name string, mirroring the Java entities'
        // @Enumerated(EnumType.STRING) - so existing table data (and any manual SQL) keeps working.
        modelBuilder.Entity<User>(b =>
        {
            b.HasIndex(u => u.Email).IsUnique();
            b.HasIndex(u => u.Phone).IsUnique();
            b.Property(u => u.Gender).HasConversion<string>();
            b.Property(u => u.Role).HasConversion<string>();
            b.Property(u => u.AuthProvider).HasConversion<string>();
        });

        modelBuilder.Entity<Cart>(b =>
        {
            b.HasIndex(c => c.UserId).IsUnique();
        });

        modelBuilder.Entity<CartItem>(b =>
        {
            b.HasOne(ci => ci.Cart).WithMany().HasForeignKey(ci => ci.CartId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(ci => ci.Product).WithMany().HasForeignKey(ci => ci.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SubCategory>(b =>
        {
            b.HasOne(sc => sc.Category).WithMany().HasForeignKey(sc => sc.CatmasterId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Config>(b =>
        {
            b.HasIndex(c => c.ConfigName).IsUnique();
        });

        modelBuilder.Entity<ProductSpecification>(b =>
        {
            b.HasOne(ps => ps.Product).WithMany().HasForeignKey(ps => ps.ProductId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(ps => ps.Config).WithMany().HasForeignKey(ps => ps.ConfigId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProductImage>(b =>
        {
            b.HasOne(pi => pi.Product).WithMany().HasForeignKey(pi => pi.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Product>(b =>
        {
            b.HasIndex(p => p.ProductName).IsUnique();
            b.HasOne(p => p.Category).WithMany().HasForeignKey(p => p.CategoryId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(p => p.SubCategory).WithMany().HasForeignKey(p => p.SubCategoryId).OnDelete(DeleteBehavior.Restrict);
            b.Property(p => p.OfferType).HasConversion<string>();
            b.Property(p => p.DisplayType).HasConversion<string>();
            b.Ignore(p => p.ResolvedOfferType);
            b.Ignore(p => p.ResolvedCashRequired);
            b.Ignore(p => p.ResolvedPointsRequired);
        });

        modelBuilder.Entity<Orders>(b =>
        {
            b.Property(o => o.DeliveryOption).HasConversion<string>();
            b.Property(o => o.PaymentStatus).HasConversion<string>();
            b.HasMany(o => o.Items).WithOne(oi => oi.Order).HasForeignKey(oi => oi.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderItem>(b =>
        {
            b.HasOne(oi => oi.Product).WithMany().HasForeignKey(oi => oi.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EmcardAccount>(b =>
        {
            b.HasIndex(a => a.UserId).IsUnique();
            b.Property(a => a.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<EmcardReservation>(b =>
        {
            b.HasIndex(r => new { r.UserId, r.ProductId }).IsUnique().HasDatabaseName("uq_emcard_user_product");
        });

        modelBuilder.Entity<EmcardTransaction>(b =>
        {
            b.Property(t => t.TxnType).HasConversion<string>();
            b.HasIndex(t => t.UserId).HasDatabaseName("idx_emcard_txn_user");
            b.HasIndex(t => t.OrderId).HasDatabaseName("idx_emcard_txn_order");
        });
    }

    /// <summary>
    /// Runs <see cref="Product.NormaliseOffer"/> on every inserted/modified Product, and stamps
    /// CreatedAt/UpdatedAt on every IAuditable entity, before the write reaches the database -
    /// mirrors Product's @PrePersist/@PreUpdate and the other entities' Spring Data JPA
    /// @CreatedDate/@LastModifiedDate auditing in the Java source.
    /// </summary>
    public override int SaveChanges()
    {
        NormaliseProducts();
        ApplyAuditing();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        NormaliseProducts();
        ApplyAuditing();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditing()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<Emart.Domain.Common.IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }

    private void NormaliseProducts()
    {
        foreach (var entry in ChangeTracker.Entries<Product>())
        {
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Entity.NormaliseOffer();
            }
        }
    }
}
