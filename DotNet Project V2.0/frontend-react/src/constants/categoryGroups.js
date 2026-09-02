export const ALL_CATEGORIES = {
    label: "All Categories",
    value: "all",
    catId: null,
};

const CAT_ID_LABELS = {
    ELE: "Electronics & Appliances",
    GRO: "Grocery",
    RTC: "Ready To Cook",
    BEV: "Beverages",
    BPC: "Beauty & Personal Care",
    HOM: "Home Care",
};

export function buildCategoryGroups(categories = []) {
    const counts = {};

    categories.forEach((category) => {
        if (category?.catId) {
            counts[category.catId] =
                (counts[category.catId] || 0) + 1;
        }
    });

    const groups = Object.keys(counts)
        .sort()
        .map((catId) => ({
            label: CAT_ID_LABELS[catId] || catId,
            value: catId,
            catId,
            count: counts[catId],
        }));

    return [ALL_CATEGORIES, ...groups];
}

export function getCategoryGroup(
    selectedCategory,
    categoryGroups = []
) {
    return (
        categoryGroups.find(
            (group) => group.value === selectedCategory
        ) ?? ALL_CATEGORIES
    );
}
