using Emart.Application.Common.Exceptions;
using Emart.Application.Repositories;
using Emart.Application.Services;
using Emart.Domain.Entities;
using Emart.Domain.Purchase;
using Emart.Domain.Purchase.Strategy;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using NUnit.Framework;

namespace Emart.UnitTests.Services;

/// <summary>
/// Targeted tests for EmcardService.SettleCheckoutAsync - the row-locked re-validation that
/// makes a negative eMCard balance impossible, ported from the intent (not the JUnit source,
/// which tests this indirectly through Spring integration) of EmcardServiceImpl#settleCheckout.
/// </summary>
[TestFixture]
public class EmcardServiceSettlementTests
{
    private Mock<IEmcardAccountRepository> _accountRepository = null!;
    private Mock<IEmcardReservationRepository> _reservationRepository = null!;
    private Mock<IEmcardTransactionRepository> _transactionRepository = null!;
    private Mock<IProductRepository> _productRepository = null!;
    private Mock<IUserRepository> _userRepository = null!;
    private Mock<ICartRepository> _cartRepository = null!;
    private Mock<ICartItemRepository> _cartItemRepository = null!;
    private Mock<IUnitOfWork> _unitOfWork = null!;
    private PurchaseDecisionEngine _purchaseEngine = null!;
    private EmcardService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _accountRepository = new Mock<IEmcardAccountRepository>();
        _reservationRepository = new Mock<IEmcardReservationRepository>();
        _transactionRepository = new Mock<IEmcardTransactionRepository>();
        _productRepository = new Mock<IProductRepository>();
        _userRepository = new Mock<IUserRepository>();
        _cartRepository = new Mock<ICartRepository>();
        _cartItemRepository = new Mock<ICartItemRepository>();
        _unitOfWork = new Mock<IUnitOfWork>();

        var registry = new PurchaseModeRegistry(new IPurchaseModeStrategy[]
        {
            new CashOnlyStrategy(),
            new EmcardDiscountStrategy(),
            new FullRedemptionStrategy(),
            new PartialRedemptionStrategy()
        });
        _purchaseEngine = new PurchaseDecisionEngine(registry, new LoyaltyPolicy());

        _service = new EmcardService(
            _accountRepository.Object,
            _reservationRepository.Object,
            _transactionRepository.Object,
            _productRepository.Object,
            _userRepository.Object,
            _cartRepository.Object,
            _cartItemRepository.Object,
            _purchaseEngine,
            _unitOfWork.Object,
            NullLogger<EmcardService>.Instance);
    }

    [Test]
    public async Task SettleCheckout_RedeemMoreThanBalance_ThrowsAndNeverWritesBalance()
    {
        var account = new EmcardAccount(userId: 1, totalPoints: 100);
        _accountRepository.Setup(r => r.FindByUserIdForUpdateAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(account);

        var act = () => _service.SettleCheckoutAsync(1, orderId: 99, pointsToRedeem: 150, paidAmount: 0m);

        await act.Should().ThrowAsync<InsufficientPointsException>();

        _accountRepository.Verify(r => r.Update(It.IsAny<EmcardAccount>()), Times.Never);
        _transactionRepository.Verify(r => r.AddAsync(It.IsAny<EmcardTransaction>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task SettleCheckout_NonMemberWithNoAccount_IsNoOp()
    {
        _accountRepository.Setup(r => r.FindByUserIdForUpdateAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync((EmcardAccount?)null);
        _userRepository.Setup(r => r.GetByIdAsync(2L, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { UserId = 2, IsEmcardMember = false, Email = "guest@example.com", FirstName = "G", LastName = "T" });

        var result = await _service.SettleCheckoutAsync(2, orderId: null, pointsToRedeem: 0, paidAmount: 100m);

        result.PointsRedeemed.Should().Be(0);
        result.PointsEarned.Should().Be(0);
        _accountRepository.Verify(r => r.AddAsync(It.IsAny<EmcardAccount>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task SettleCheckout_NonMemberTryingToRedeem_Throws()
    {
        _accountRepository.Setup(r => r.FindByUserIdForUpdateAsync(3, It.IsAny<CancellationToken>())).ReturnsAsync((EmcardAccount?)null);

        var act = () => _service.SettleCheckoutAsync(3, orderId: null, pointsToRedeem: 10, paidAmount: 0m);

        await act.Should().ThrowAsync<InsufficientPointsException>();
    }

    [Test]
    public async Task SettleCheckout_ValidRedeemAndEarn_UpdatesBalanceAndWritesLedger()
    {
        var account = new EmcardAccount(userId: 4, totalPoints: 500);
        _accountRepository.Setup(r => r.FindByUserIdForUpdateAsync(4, It.IsAny<CancellationToken>())).ReturnsAsync(account);
        _userRepository.Setup(r => r.GetByIdAsync(4L, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { UserId = 4, IsEmcardMember = true, Email = "member@example.com", FirstName = "M", LastName = "T" });

        // Redeem 120 points, pay 80 cash -> earns 10% of 80 = 8.
        var result = await _service.SettleCheckoutAsync(4, orderId: 55, pointsToRedeem: 120, paidAmount: 80m);

        result.PointsRedeemed.Should().Be(120);
        result.PointsEarned.Should().Be(8);
        result.TotalPointsBefore.Should().Be(500);
        result.TotalPointsAfter.Should().Be(500 - 120 + 8);

        account.TotalPoints.Should().Be(388);

        _transactionRepository.Verify(r => r.AddAsync(
            It.Is<EmcardTransaction>(t => t.TxnType == Emart.Domain.Enums.EmcardTransactionType.REDEEM && t.Points == 120),
            It.IsAny<CancellationToken>()), Times.Once);

        _transactionRepository.Verify(r => r.AddAsync(
            It.Is<EmcardTransaction>(t => t.TxnType == Emart.Domain.Enums.EmcardTransactionType.EARN && t.Points == 8),
            It.IsAny<CancellationToken>()), Times.Once);

        _reservationRepository.Verify(r => r.DeleteAllByUserIdAsync(4, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task SettleCheckout_ZeroCashPaid_EarnsNothing()
    {
        var account = new EmcardAccount(userId: 5, totalPoints: 450);
        _accountRepository.Setup(r => r.FindByUserIdForUpdateAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(account);
        _userRepository.Setup(r => r.GetByIdAsync(5L, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { UserId = 5, IsEmcardMember = true, Email = "m2@example.com", FirstName = "M", LastName = "T" });

        var result = await _service.SettleCheckoutAsync(5, orderId: 60, pointsToRedeem: 450, paidAmount: 0m);

        result.PointsEarned.Should().Be(0);
        account.TotalPoints.Should().Be(0);
    }
}
