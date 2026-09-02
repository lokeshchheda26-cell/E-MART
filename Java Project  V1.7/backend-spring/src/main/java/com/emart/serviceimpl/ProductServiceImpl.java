package com.emart.serviceimpl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.emart.dto.ProductDetailsResponseDTO;
import com.emart.dto.ProductSaleResponseDTO;
import com.emart.dto.ProductSpecificationDTO;
import com.emart.entity.Product;
import com.emart.entity.ProductDisplayType;
import com.emart.entity.ProductImage;
import com.emart.entity.ProductOfferType;
import com.emart.exception.ResourceNotFoundException;
import com.emart.repository.OrderItemRepository;
import com.emart.repository.ProductImageRepository;
import com.emart.repository.ProductRepository;
import com.emart.repository.ProductSpecificationRepository;
import com.emart.service.ProductService;
import com.emart.service.purchase.ProductOffer;
import com.emart.service.purchase.PurchaseDecisionEngine;

@Service
public class ProductServiceImpl
        implements ProductService {


    private final ProductRepository repository;

    private final ProductImageRepository imageRepository;

    private final ProductSpecificationRepository specificationRepository;

    private final OrderItemRepository orderItemRepository;

    private final PurchaseDecisionEngine purchaseEngine;


    // =========================
    // CONSTRUCTOR INJECTION
    // =========================

    public ProductServiceImpl(
            ProductRepository repository,
            ProductImageRepository imageRepository,
            ProductSpecificationRepository specificationRepository,
            OrderItemRepository orderItemRepository,
            PurchaseDecisionEngine purchaseEngine) {

        this.repository = repository;
        this.imageRepository = imageRepository;
        this.specificationRepository = specificationRepository;
        this.orderItemRepository = orderItemRepository;
        this.purchaseEngine = purchaseEngine;
    }


    // =========================
    // CREATE
    // =========================

    @Override
    public Product save(Product product) {

        return repository.save(product);
    }


    // =========================
    // GET PRODUCT DETAILS
    // (Product + Images + Specifications)
    // =========================

    @Override
    public ProductDetailsResponseDTO getProductDetails(
            Long productId) {


        // 1. Validate that the product exists.

        Product product = repository
                .findById(productId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Product not found with id: " + productId
                        )
                );


        // 2. Fetch all images of the product.
        //    The product's own main image (prod_image_path on
        //    Product_Master) is always included first, since
        //    that is what the listing page already uses and is
        //    populated for every existing product. Any extra
        //    images added later in Product_Image_Master are
        //    appended after it.

        List<String> imageUrls = new ArrayList<>();

        if (product.getProductImagePath() != null
                && !product.getProductImagePath().isBlank()) {

            imageUrls.add(product.getProductImagePath());
        }

        List<String> galleryImageUrls = imageRepository
                .findByProduct_ProductIdOrderByImageIdAsc(productId)
                .stream()
                .map(ProductImage::getImageUrl)
                .filter(url -> url != null && !url.isBlank())
                .filter(url -> !imageUrls.contains(url))
                .collect(Collectors.toList());

        imageUrls.addAll(galleryImageUrls);


        // 3. Fetch all configurations/specifications.

        List<ProductSpecificationDTO> specifications =
                specificationRepository
                        .findSpecificationsByProductId(productId);


        // 4. Convert everything into a single DTO.

        return mapToProductDetailsResponseDTO(
                product,
                imageUrls,
                specifications
        );
    }


    // =========================
    // ENTITY -> DTO MAPPING
    // (manual mapping, no MapStruct/ModelMapper)
    // =========================

    private ProductDetailsResponseDTO mapToProductDetailsResponseDTO(
            Product product,
            List<String> imageUrls,
            List<ProductSpecificationDTO> specifications) {

        ProductDetailsResponseDTO dto =
                new ProductDetailsResponseDTO();

        dto.setProductId(product.getProductId());
        dto.setProductName(product.getProductName());

        // Selling price shown by default is the Regular Price - MRP,
        // or the active salePrice if this exact product is currently
        // on sale (onSale = true and saleEndDate still in the
        // future) - matching the homepage Sale Banner, the product
        // listing page's "Regular Price" line, and Cart/Checkout's
        // default (unapplied) unit price (see CategoryList.jsx
        // getRegularPrice / CartServiceImpl.buildCartResponse).
        //
        // This USED TO default to cardholderPrice (the member/
        // eMcard price) whenever a product wasn't on sale, even
        // though nothing on this page indicated the shopper had
        // opted into eMcard - that's exactly why the Product
        // Details price didn't match the Regular Price shown
        // everywhere else. mrpPrice/cardholderPrice are exposed
        // separately below so the frontend can still show the
        // eMcard price + checkbox, same as the listing page.
        // The purchase mode, and every figure derived from it, come from
        // the ONE central algorithm (PurchaseDecisionEngine), described
        // here for an eMCard MEMBER. ProductVisibilityAdvice collapses
        // the whole block to CASH_ONLY/MRP for anyone else, so the
        // member-only numbers never reach a non-member over the wire.
        ProductOffer offer = purchaseEngine.describeOffer(product, true);

        boolean saleActive = offer.isSaleActive();

        BigDecimal price = offer.getSellingPrice().signum() > 0
                ? offer.getSellingPrice()
                : product.getCardholderPrice();

        dto.setPrice(price);
        // Lets the Product Details page know the price above is a
        // sale price, so it can block eMcard point redemption on it.
        dto.setOnSale(saleActive);

        // ---- mode-driven display fields (Mode 1..4) ----
        dto.setPurchaseMode(offer.getMode().name());
        dto.setPurchaseModeLabel(offer.getMode().getLabel());
        dto.setPurchaseModeNumber(offer.getMode().getModeNumber());
        dto.setEmcardCashPrice(offer.getEmcardCashPrice());
        dto.setPointsRequired(offer.getPointsRequired());
        dto.setEmcardSavings(offer.getEmcardSavings());
        dto.setPointsOptional(offer.isPointsOptional());
        dto.setEarnsPoints(offer.isEarnsPoints());
        // Lets the page show what THIS purchase earns (rate x cash
        // payable) without hardcoding the percentage anywhere.
        dto.setEarnRatePercent(
                purchaseEngine.getLoyaltyPolicy().earnRatePercentLabel());

        dto.setMrpPrice(product.getMrpPrice());
        dto.setCardholderPrice(product.getCardholderPrice());

        // Prefer the detailed description; fall back to
        // the short description.
        String description = product.getLongDescription() != null
                && !product.getLongDescription().isBlank()
                ? product.getLongDescription()
                : product.getShortDescription();
        dto.setDescription(description);

        dto.setBrand(product.getBrand());

        dto.setCategory(
                product.getCategory() != null
                        ? product.getCategory().getCatName()
                        : null
        );

        dto.setStock(product.getStock());

        dto.setPoints(product.getPointsToBeRedeemed());

        // Explicit offer/display classification so the page doesn't
        // have to re-derive the rule from the price columns. For a
        // non-member these are collapsed to NORMAL / MRP_ONLY on the
        // way out (see ProductVisibilityAdvice - Condition 1).
        ProductOfferType offerType = product.getOfferType() != null
                ? product.getOfferType()
                : ProductOfferType.derive(
                        product.getMrpPrice(),
                        product.getCardholderPrice(),
                        product.getPointsToBeRedeemed());

        dto.setOfferType(offerType.name());
        dto.setDisplayType(
                (product.getDisplayType() != null
                        ? product.getDisplayType()
                        : ProductDisplayType.forOfferType(offerType)).name());

        dto.setTotalPointsRedeemed(
                orderItemRepository.sumPointsRedeemedByProductId(
                        product.getProductId())
        );

        dto.setImages(
                imageUrls != null ? imageUrls : new ArrayList<>()
        );

        dto.setSpecifications(
                specifications != null ? specifications : new ArrayList<>()
        );

        return dto;
    }


    // =========================
    // GET ALL
    // =========================

    @Override
    public List<Product> getAll() {

        return repository.findAll();
    }


    // =========================
    // GET BY ID
    // =========================

    @Override
    public Product getById(Long id) {

        return repository
                .findById(id)
                .orElse(null);
    }


    // =========================
    // GET BY SUB CATEGORY
    // =========================

    @Override
    public List<Product> getBySubCategoryId(
            Integer subcatMasterId) {

        return repository
                .findBySubCategory_SubcatMasterId(
                        subcatMasterId
                );
    }


    // =========================
    // GET BY CATEGORY (active only)
    // =========================

    @Override
    public List<Product> getByCategoryId(
            Integer catmasterId) {

        return repository
                .findByCategory_CatmasterIdAndStatusTrue(
                        catmasterId
                );
    }


    // =========================
    // GET DISTINCT ACTIVE BRANDS
    // FOR A CATEGORY
    // =========================

    @Override
    public List<String> getBrandsByCategoryId(
            Integer catmasterId) {

        return repository
                .findDistinctActiveBrandsByCategory(
                        catmasterId
                );
    }


    // =========================
    // GET BY CATEGORY + BRAND
    // (active only)
    // =========================

    @Override
    public List<Product> getByCategoryAndBrand(
            Integer catmasterId,
            String brand) {

        return repository
                .findByCategory_CatmasterIdAndBrandIgnoreCaseAndStatusTrue(
                        catmasterId,
                        brand
                );
    }


    // =========================
    // GET DISTINCT ACTIVE BRANDS
    // FOR A MAIN-CATEGORY GROUP
    // (Category.catId code)
    // =========================

    @Override
    public List<String> getBrandsByCategoryCode(
            String catId) {

        return repository
                .findDistinctActiveBrandsByCategoryCode(
                        catId
                );
    }


    // =========================
    // GET BY MAIN-CATEGORY GROUP
    // CODE + BRAND (active only)
    // =========================

    @Override
    public List<Product> getByCategoryCodeAndBrand(
            String catId,
            String brand) {

        return repository
                .findByCategory_CatIdAndBrandIgnoreCaseAndStatusTrue(
                        catId,
                        brand
                );
    }


    // =========================
    // FILTER BY CATEGORY GROUP +
    // OPTIONAL BRAND + PRICE RANGE
    // =========================

    @Override
    public List<Product> filterByCategoryGroup(
            String catId,
            String brand,
            java.math.BigDecimal minPrice,
            java.math.BigDecimal maxPrice) {

        // Blank strings are treated the same as "no brand filter" -
        // the frontend's "Any brand" option sends "" rather than
        // omitting the param.
        String normalizedBrand =
                (brand == null || brand.isBlank()) ? null : brand;

        return repository.filterByCategoryGroup(
                catId,
                normalizedBrand,
                minPrice,
                maxPrice
        );
    }


    // =========================
    // SEARCH
    // =========================

    @Override
    public List<Product> search(String keyword) {

        // A blank/whitespace-only query returns the full active
        // catalog rather than an empty result - mirrors what the
        // frontend already showed before a search was typed, and
        // avoids a confusing "no products found" for an empty box.
        if (keyword == null || keyword.isBlank()) {
            return repository.findAll();
        }

        return repository.searchProducts(
                keyword.trim().toLowerCase()
        );
    }


    // =========================
    // UPDATE
    // =========================

    @Override
    public Product update(
            Long id,
            Product product) {


        Product oldProduct =
                repository
                        .findById(id)
                        .orElse(null);


        if (oldProduct != null) {


            // Product Name

            oldProduct.setProductName(
                    product.getProductName()
            );


            // Short Description

            oldProduct.setShortDescription(
                    product.getShortDescription()
            );


            // Long Description

            oldProduct.setLongDescription(
                    product.getLongDescription()
            );


            // Image Path

            oldProduct.setProductImagePath(
                    product.getProductImagePath()
            );


            // MRP Price

            oldProduct.setMrpPrice(
                    product.getMrpPrice()
            );


            // Cardholder Price

            oldProduct.setCardholderPrice(
                    product.getCardholderPrice()
            );


            // Brand

            oldProduct.setBrand(
                    product.getBrand()
            );


            // Stock

            oldProduct.setStock(
                    product.getStock()
            );


            // Points

            oldProduct.setPointsToBeRedeemed(
                    product.getPointsToBeRedeemed()
            );


            // Status

            oldProduct.setStatus(
                    product.getStatus()
            );


            // Category

            oldProduct.setCategory(
                    product.getCategory()
            );


            // Sub Category

            oldProduct.setSubCategory(
                    product.getSubCategory()
            );


            return repository.save(
                    oldProduct
            );
        }


        return null;
    }


    // =========================
    // DELETE
    // =========================

    @Override
    public void delete(Long id) {

        repository.deleteById(id);
    }


    // =========================
    // GET ONE RANDOM ACTIVE-SALE
    // PRODUCT (homepage Sale Banner)
    // =========================

    @Override
    public Optional<ProductSaleResponseDTO> getRandomSaleProduct() {

        return repository
                .findRandomActiveSaleProduct()
                .map(this::mapToProductSaleResponseDTO);
    }


    private ProductSaleResponseDTO mapToProductSaleResponseDTO(
            Product product) {

        // Original ("was") price for the strikethrough - mrpPrice is
        // the true list price; cardholderPrice is only a fallback in
        // case mrpPrice is somehow blank on old data.
        BigDecimal originalPrice = product.getMrpPrice() != null
                ? product.getMrpPrice()
                : product.getCardholderPrice();

        // Discounted price shown during the sale - falls back to
        // cardholderPrice (and then originalPrice) if a dedicated
        // salePrice was never set on this product.
        BigDecimal discountedPrice = product.getSalePrice() != null
                ? product.getSalePrice()
                : (product.getCardholderPrice() != null
                        ? product.getCardholderPrice()
                        : originalPrice);

        Integer discountPercent = null;

        if (originalPrice != null
                && discountedPrice != null
                && originalPrice.compareTo(BigDecimal.ZERO) > 0) {

            BigDecimal savings = originalPrice.subtract(discountedPrice);

            discountPercent = savings
                    .divide(originalPrice, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP)
                    .intValue();
        }

        return new ProductSaleResponseDTO(
                product.getProductId(),
                product.getProductName(),
                product.getProductImagePath(),
                originalPrice,
                discountedPrice,
                discountPercent,
                product.getSaleEndDate()
        );
    }
}