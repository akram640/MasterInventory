import { CategoryOverview, InventoryItem } from '../types/inventory';

export const CANONICAL_CATEGORIES: { id: string; name: string; icon: string }[] = [
  { id: 'cat-med', name: 'Medicine & Health', icon: 'health_and_safety' },
  { id: 'cat-appliance', name: 'Home Appliances', icon: 'local_laundry_service' },
  { id: 'cat-elec', name: 'Electronics & Tech', icon: 'devices' },
  { id: 'cat-app', name: 'Wardrobe & Apparel', icon: 'apparel' },
  { id: 'cat-furn', name: 'Home & Furniture', icon: 'chair' },
  { id: 'cat-veh', name: 'Vehicles & Mobility', icon: 'commute' },
  { id: 'cat-doc', name: 'Documents & Valuables', icon: 'folder_special' },
];

/**
 * Returns the canonical category name for any item so every item belongs
 * to exactly one category on both Home (Dashboard) and Inventory screens.
 */
export function resolveCanonicalCategoryName(item: InventoryItem): string {
  const itemCat = (item.category || '').toLowerCase().trim();
  const itemSub = (item.subCategory || item.subname || '').toLowerCase().trim();

  if (
    itemCat.includes('medicine') ||
    itemCat.includes('health') ||
    itemCat.includes('wellness') ||
    itemSub.includes('supplement') ||
    itemSub.includes('pharma')
  ) {
    return 'Medicine & Health';
  }
  if (itemCat.includes('appliance') || itemCat.includes('laundry') || itemSub.includes('laundry')) {
    return 'Home Appliances';
  }
  if (itemCat.includes('electr') || itemCat.includes('tech')) {
    return 'Electronics & Tech';
  }
  if (itemCat.includes('apparel') || itemCat.includes('wardrobe') || itemCat.includes('clothing')) {
    return 'Wardrobe & Apparel';
  }
  if (itemCat.includes('furn') || itemCat.includes('chair') || itemCat.includes('table')) {
    return 'Home & Furniture';
  }
  if (itemCat.includes('veh') || itemCat.includes('car') || itemCat.includes('mobility')) {
    return 'Vehicles & Mobility';
  }
  if (itemCat.includes('doc') || itemCat.includes('valuable')) {
    return 'Documents & Valuables';
  }

  // Fallback to exact trimmed category or Documents & Valuables
  return item.category?.trim() || 'Documents & Valuables';
}

/**
 * Checks whether an inventory item belongs to the given category filter label.
 */
export function doesItemMatchCategory(item: InventoryItem, filterLabel: string): boolean {
  if (!filterLabel || filterLabel === 'All') return true;
  const canonical = resolveCanonicalCategoryName(item).toLowerCase();
  const target = filterLabel.toLowerCase().trim();

  if (canonical === target) return true;

  // Also support legacy filter strings if passed
  if (
    (target === 'medicine' || target === 'health & wellness' || target === 'medicine & health') &&
    canonical === 'medicine & health'
  ) {
    return true;
  }
  if ((target === 'electronics' || target === 'electronics & tech') && canonical === 'electronics & tech') {
    return true;
  }
  if ((target === 'apparel' || target === 'wardrobe & apparel') && canonical === 'wardrobe & apparel') {
    return true;
  }
  if ((target === 'furniture' || target === 'home & furniture') && canonical === 'home & furniture') {
    return true;
  }
  if ((target === 'vehicles' || target === 'vehicles & mobility') && canonical === 'vehicles & mobility') {
    return true;
  }
  if ((target === 'documents' || target === 'documents & valuables') && canonical === 'documents & valuables') {
    return true;
  }

  return (item.category || '').toLowerCase().trim() === target;
}

/**
 * Computes the unified CategoryOverview list used identically by both
 * the Home screen (DashboardScreen) and Inventory Vault screen (InventoryScreen).
 */
export function computeUnifiedCategories(inventoryItems: InventoryItem[]): CategoryOverview[] {
  const baseResults: CategoryOverview[] = CANONICAL_CATEGORIES.map((cat) => {
    const count = inventoryItems.filter((item) => doesItemMatchCategory(item, cat.name)).length;
    return {
      ...cat,
      count,
      flaggedText: `${count} indexed`,
    };
  });

  // Include any custom user categories that didn't map to the 7 canonical ones
  const canonicalNamesLower = new Set(CANONICAL_CATEGORIES.map((c) => c.name.toLowerCase()));
  const extraCounts: Record<string, number> = {};

  inventoryItems.forEach((item) => {
    const resolved = resolveCanonicalCategoryName(item);
    if (!canonicalNamesLower.has(resolved.toLowerCase())) {
      extraCounts[resolved] = (extraCounts[resolved] || 0) + 1;
    }
  });

  Object.entries(extraCounts).forEach(([customName, count]) => {
    baseResults.push({
      id: `cat-custom-${customName.toLowerCase().replace(/\s+/g, '-')}`,
      name: customName,
      icon: 'category',
      count,
      flaggedText: `${count} indexed`,
    });
  });

  return baseResults;
}
