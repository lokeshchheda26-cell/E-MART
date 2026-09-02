namespace Emart.Domain.Common;

/// <summary>
/// Marks an entity that should have CreatedAt set on insert and UpdatedAt set on every
/// insert/update, mirroring the Java entities' Spring Data JPA @CreatedDate/@LastModifiedDate
/// auditing (Cart, CartItem, Product, EmcardAccount, EmcardReservation, Orders) or manual
/// @PrePersist/@PreUpdate timestamp hooks (User) - handled centrally in EmartDbContext.SaveChanges
/// rather than scattered across every service that creates one of these entities.
/// </summary>
public interface IAuditable
{
    DateTime CreatedAt { get; set; }

    DateTime UpdatedAt { get; set; }
}
