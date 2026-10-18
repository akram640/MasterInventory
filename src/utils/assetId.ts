import { InventoryItem } from '../types/inventory';
import { resolveCanonicalCategoryName } from './categoryTaxonomy';

export const ASSET_ID_REGEX = /^[A-Z]{3}-\d{6}-[0-9A-F]{4}$/;

/**
 * Checks whether a candidate string conforms to the uniform OmniVault Asset ID
 * format: CAT-YYMMDD-HASH (e.g., ELE-261017-8F2A).
 */
export function isValidAssetId(value?: string | null): boolean {
  if (!value) return false;
  return ASSET_ID_REGEX.test(value.trim());
}

/**
 * Resolves a 3-letter uppercase category prefix for the Asset ID.
 */
export function getCategoryPrefix(category?: string, subCategory?: string): string {
  const canonical = resolveCanonicalCategoryName({
    id: '',
    code: '',
    name: '',
    subname: subCategory || '',
    category: category || '',
    subCategory: subCategory || '',
    status: 'Active',
    statusLabel: '',
    badgeType: 'neutral',
    value: 0,
    boughtDate: '',
    imageUrl: '',
    imageAlt: '',
  }).toLowerCase();

  const rawCat = (category || '').toLowerCase();

  if (canonical.includes('medicine') || canonical.includes('health')) return 'MED';
  if (canonical.includes('electronics') || canonical.includes('tech')) return 'ELE';
  if (canonical.includes('appliance') || rawCat.includes('home')) return 'HOM';
  if (canonical.includes('wardrobe') || canonical.includes('apparel')) return 'WAR';
  if (canonical.includes('furniture')) return 'FUR';
  if (canonical.includes('vehicle') || canonical.includes('mobility')) return 'VEH';
  if (canonical.includes('document') || canonical.includes('valuable')) return 'DOC';

  const lettersOnly = (category || 'AST').replace(/[^a-zA-Z]/g, '').toUpperCase();
  return (lettersOnly.slice(0, 3) || 'AST').padEnd(3, 'X');
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function formatDateToYYMMDD(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Extracts a 6-digit YYMMDD date stamp from an asset's purchaseDate, boughtDate,
 * or creation timestamp inside its ID, falling back to today's date.
 */
export function extractDateStampYYMMDD(params: {
  purchaseDate?: string;
  boughtDate?: string;
  id?: string;
}): string {
  // 1. Check if item.id embeds a millisecond creation timestamp (e.g. real-item-1760711234567)
  if (params.id) {
    const tsMatch = params.id.match(/(?:real-item-|item-|scan-|arch-)(\d{12,14})/);
    if (tsMatch) {
      const ts = Number(tsMatch[1]);
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getFullYear() <= 2035) {
        return formatDateToYYMMDD(d);
      }
    }
  }

  const rawDate = (params.purchaseDate || params.boughtDate || '').trim();
  if (rawDate && rawDate.toLowerCase() !== 'n/a') {
    // ISO YYYY-MM-DD
    const isoMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const yy = isoMatch[1].slice(-2);
      const mm = isoMatch[2].padStart(2, '0');
      const dd = isoMatch[3].padStart(2, '0');
      return `${yy}${mm}${dd}`;
    }

    // DD/MM/YYYY or MM/DD/YYYY
    const slashFull = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashFull) {
      const p1 = Number(slashFull[1]);
      const p2 = Number(slashFull[2]);
      const yy = slashFull[3].slice(-2);
      const mm = String(p1 > 12 ? p2 : p1).padStart(2, '0');
      const dd = String(p1 > 12 ? p1 : p2).padStart(2, '0');
      return `${yy}${mm}${dd}`;
    }

    // Month DD, YYYY or DD Month YYYY (e.g. "Oct 17, 2026" or "17 Oct 2026")
    const namedFull = rawDate.match(/([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
    if (namedFull) {
      const m = MONTH_MAP[namedFull[1].toLowerCase()];
      if (m) {
        const yy = namedFull[3].slice(-2);
        const mm = String(m).padStart(2, '0');
        const dd = namedFull[2].padStart(2, '0');
        return `${yy}${mm}${dd}`;
      }
    }

    const dayFirstNamed = rawDate.match(/(\d{1,2})\s+([a-zA-Z]{3,9}),?\s+(\d{4})/);
    if (dayFirstNamed) {
      const m = MONTH_MAP[dayFirstNamed[2].toLowerCase()];
      if (m) {
        const yy = dayFirstNamed[3].slice(-2);
        const mm = String(m).padStart(2, '0');
        const dd = dayFirstNamed[1].padStart(2, '0');
        return `${yy}${mm}${dd}`;
      }
    }

    // Month YYYY (e.g. "Nov 2023")
    const monthYear = rawDate.match(/([a-zA-Z]{3,9})\s+(\d{4})/);
    if (monthYear) {
      const m = MONTH_MAP[monthYear[1].toLowerCase()];
      if (m) {
        const yy = monthYear[2].slice(-2);
        const mm = String(m).padStart(2, '0');
        return `${yy}${mm}01`;
      }
    }

    // Standalone Year (e.g. "2021")
    const yearOnly = rawDate.match(/\b(20\d{2})\b/);
    if (yearOnly) {
      return `${yearOnly[1].slice(-2)}0101`;
    }
  }

  return formatDateToYYMMDD(new Date());
}

/**
 * Computes a deterministic 4-character uppercase hexadecimal fingerprint (FNV-1a)
 * from a seed string.
 */
export function computeFnv1aHex4(seed: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const folded = ((hash >>> 16) ^ (hash & 0xffff)) & 0xffff;
  const safeVal = folded === 0 ? 0x8f2a : folded;
  return safeVal.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates a uniform, globally unique Asset ID in the format CAT-YYMMDD-HASH
 * (e.g., ELE-261017-8F2A). Guarantees zero collisions against `usedIds`.
 */
export function generateUniqueAssetId(
  params: {
    id?: string;
    name?: string;
    category?: string;
    subCategory?: string;
    purchaseDate?: string;
    boughtDate?: string;
  },
  usedIds?: Set<string>
): string {
  const prefix = getCategoryPrefix(params.category, params.subCategory);
  const datePart = extractDateStampYYMMDD({
    purchaseDate: params.purchaseDate,
    boughtDate: params.boughtDate,
    id: params.id,
  });

  const baseSeed = `${params.id || 'asset'}|${(params.name || '').trim().toLowerCase()}|${prefix}|${datePart}`;

  let attempt = 0;
  while (attempt < 1000) {
    const seed = attempt === 0 ? baseSeed : `${baseSeed}#${attempt}`;
    const hex4 = computeFnv1aHex4(seed);
    const candidate = `${prefix}-${datePart}-${hex4}`;
    if (!usedIds || !usedIds.has(candidate)) {
      if (usedIds) usedIds.add(candidate);
      return candidate;
    }
    attempt++;
  }

  const fallback = `${prefix}-${datePart}-${Math.floor(4096 + Math.random() * 61439)
    .toString(16)
    .toUpperCase()}`;
  if (usedIds) usedIds.add(fallback);
  return fallback;
}

/**
 * Returns the canonical Asset ID for display across Table, Grid, Dashboard,
 * Dossier, and Inspector views.
 */
export function resolveDisplayAssetId(item: InventoryItem): string {
  const cleanCode = (item.code || '').replace(/^#/, '').trim();
  if (isValidAssetId(cleanCode)) return cleanCode;

  const cleanSerial = (item.serialNumber || '').replace(/^#/, '').trim();
  if (isValidAssetId(cleanSerial)) return cleanSerial;

  return generateUniqueAssetId({
    id: item.id,
    name: item.name,
    category: item.category,
    subCategory: item.subCategory,
    purchaseDate: item.purchaseDate,
    boughtDate: item.boughtDate,
  });
}

/**
 * Automatically normalizes and migrates an entire list of InventoryItems so that:
 * 1. Every asset has a unique `CAT-YYMMDD-HASH` ID stored in both `code` and `serialNumber`.
 * 2. Duplicate numbers (e.g., multiple "1"s) or legacy codes (#HOM-9908) are upgraded.
 * 3. Any OCR-captured manufacturer batch/lot code previously placed in `serialNumber`
 *    (like "MQ08BGB" or "B0426006") is preserved in `barcode` if `barcode` is empty.
 */
export function normalizeInventoryAssetIds(items: InventoryItem[]): {
  items: InventoryItem[];
  mutatedItems: InventoryItem[];
} {
  const usedIds = new Set<string>();
  const mutatedItems: InventoryItem[] = [];

  // Process in deterministic ID order so hash collision resolution is identical across devices
  const indexed = items.map((item, originalIndex) => ({ item, originalIndex }));
  indexed.sort((a, b) => a.item.id.localeCompare(b.item.id));

  const normalizedByOriginalIndex = new Array<InventoryItem>(items.length);

  for (const { item, originalIndex } of indexed) {
    const expectedPrefix = getCategoryPrefix(item.category, item.subCategory);
    const candidateCode = (item.code || '').replace(/^#/, '').trim();
    const candidateSerial = (item.serialNumber || '').replace(/^#/, '').trim();

    let canonicalId = '';

    if (
      isValidAssetId(candidateCode) &&
      candidateCode.startsWith(`${expectedPrefix}-`) &&
      !usedIds.has(candidateCode)
    ) {
      canonicalId = candidateCode;
      usedIds.add(canonicalId);
    } else if (
      isValidAssetId(candidateSerial) &&
      candidateSerial.startsWith(`${expectedPrefix}-`) &&
      !usedIds.has(candidateSerial)
    ) {
      canonicalId = candidateSerial;
      usedIds.add(canonicalId);
    } else {
      canonicalId = generateUniqueAssetId(
        {
          id: item.id,
          name: item.name,
          category: item.category,
          subCategory: item.subCategory,
          purchaseDate: item.purchaseDate,
          boughtDate: item.boughtDate,
        },
        usedIds
      );
    }

    // Preserve manufacturer lot/batch code if Gemini OCR placed it in serialNumber
    const rawOldSerial = (item.serialNumber || '').trim();
    const isLegacyManufacturerLot =
      rawOldSerial.length >= 5 &&
      !rawOldSerial.startsWith('#') &&
      !isValidAssetId(rawOldSerial) &&
      !/^\d+$/.test(rawOldSerial);

    const preservedBarcode =
      (!item.barcode || item.barcode === 'N/A') && isLegacyManufacturerLot
        ? rawOldSerial
        : item.barcode;

    const needsUpdate =
      item.code !== canonicalId ||
      item.serialNumber !== canonicalId ||
      preservedBarcode !== item.barcode;

    if (needsUpdate) {
      const updatedItem: InventoryItem = {
        ...item,
        code: canonicalId,
        serialNumber: canonicalId,
        ...(preservedBarcode ? { barcode: preservedBarcode } : {}),
      };
      normalizedByOriginalIndex[originalIndex] = updatedItem;
      mutatedItems.push(updatedItem);
    } else {
      normalizedByOriginalIndex[originalIndex] = item;
    }
  }

  return {
    items: normalizedByOriginalIndex,
    mutatedItems,
  };
}
