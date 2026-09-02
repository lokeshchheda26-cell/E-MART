import { createContext, useContext, useMemo } from "react";
import { useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { getAllCategories } from "../services/categoryService";
import { buildCategoryGroups } from "../constants/categoryGroups";

/**
 * CatalogContext.jsx
 * ------------------------------------------------------------------
 * Loads the category list once for the whole application.
 *
 * Why this exists: the main-category groups are needed in two places at
 * once now - the site header's category navigation (visible on EVERY
 * route) and the home page's category tiles. Previously the home page
 * fetched GET /api/category itself and kept the result in local state,
 * which is exactly why the header on /orders, /profile, /checkout etc.
 * had no category navigation at all: the data simply wasn't there.
 *
 * Nothing about the grouping rule has changed. The database has no
 * dedicated "main category" table - a main category is the set of
 * Category rows sharing a `catId` code (e.g. "ELE") - so the groups are
 * still derived at runtime by buildCategoryGroups() from whatever rows
 * the API actually returns. Nothing is hardcoded, and an unknown code
 * still shows using its raw value rather than being hidden.
 * ------------------------------------------------------------------
 */

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const fetchCategories = useCallback(() => getAllCategories(), []);
  const {
    data: categories,
    loading,
    error,
    refetch,
  } = useApi(fetchCategories, [], { initialData: [] });

  // Inactive categories (flag === false) are never shown to shoppers.
  const activeCategories = useMemo(
    () => (categories || []).filter((category) => category.flag !== false),
    [categories]
  );

  const categoryGroups = useMemo(() => {
    return buildCategoryGroups(activeCategories)
      .filter((group) => group.value !== "all")
      .map((group) => {
        // Give each group a representative image: the first active leaf
        // category in that group that actually has one, so the tiles are
        // never blank and no image path is hardcoded.
        const withImage = activeCategories.find(
          (category) => category.catId === group.catId && category.catImagePath
        );

        return {
          catId: group.catId,
          catName: group.label,
          catImagePath: withImage?.catImagePath || null,
          flag: true,
          count: group.count,
        };
      });
  }, [activeCategories]);

  const findGroup = useCallback(
    (catId) =>
      categoryGroups.find(
        (group) => String(group.catId) === String(catId)
      ) ?? null,
    [categoryGroups]
  );

  const value = useMemo(
    () => ({
      categories: categories || [],
      activeCategories,
      categoryGroups,
      findGroup,
      loading,
      error,
      reload: refetch,
    }),
    [categories, activeCategories, categoryGroups, findGroup, loading, error, refetch]
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog must be used within a CatalogProvider");
  }
  return context;
}
