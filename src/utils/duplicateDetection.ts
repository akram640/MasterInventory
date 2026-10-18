import { InventoryItem } from '../types/inventory';

export interface DuplicateMatchResult {
  matchedItem: InventoryItem;
  matchReason: 'Exact Image Match' | 'Visually Similar Image Match' | 'Barcode Match' | 'Product Name & Brand Match';
  confidenceLabel: string;
}

export interface QuantityIncrementPreview {
  previousLabel: string;
  newLabel: string;
  previousNumeric: number;
  newNumeric: number;
  unitSuffix: string;
  stepSize: number;
}

/**
 * Computes a 64-bit perceptual difference hash (dHash) plus 3-channel average RGB
 * from an image dataURL or URL using an offscreen 9x8 HTML5 canvas.
 */
export async function computeImageDHash(imageSrc: string): Promise<string> {
  if (!imageSrc) return '';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = 9;
        const height = 8;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height).data;

        const gray: number[] = [];
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        const totalPixels = width * height;

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          rSum += r;
          gSum += g;
          bSum += b;
          gray.push(0.299 * r + 0.587 * g + 0.114 * b);
        }

        let bits = '';
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width - 1; x++) {
            const left = gray[y * width + x];
            const right = gray[y * width + (x + 1)];
            bits += left > right ? '1' : '0';
          }
        }

        const avgR = Math.round(rSum / totalPixels);
        const avgG = Math.round(gSum / totalPixels);
        const avgB = Math.round(bSum / totalPixels);

        resolve(`${bits}:${avgR},${avgG},${avgB}`);
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = imageSrc;
  });
}

/**
 * Compares two perceptual hash strings produced by computeImageDHash.
 * Returns true if the images are perceptually very similar.
 */
export function areImageHashesSimilar(hashA: string, hashB: string): boolean {
  if (!hashA || !hashB) return false;
  const [bitsA, rgbA] = hashA.split(':');
  const [bitsB, rgbB] = hashB.split(':');
  if (!bitsA || !bitsB || bitsA.length !== 64 || bitsB.length !== 64) return false;

  // Reject all-zero or all-one flat uniform hashes
  if (/^0+$/.test(bitsA) || /^1+$/.test(bitsA)) return false;

  let distance = 0;
  for (let i = 0; i < 64; i++) {
    if (bitsA[i] !== bitsB[i]) distance++;
  }

  // Check average RGB distance to prevent matching unrelated images with similar gradients
  if (rgbA && rgbB) {
    const [r1, g1, b1] = rgbA.split(',').map(Number);
    const [r2, g2, b2] = rgbB.split(',').map(Number);
    const colorDiff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    if (colorDiff > 110) return false;
  }

  // Hamming distance <= 8 out of 64 bits (>= 87.5% structural match)
  return distance <= 8;
}

function normalizeText(value?: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlaceholderName(name: string): boolean {
  const norm = normalizeText(name);
  if (!norm || norm.length < 3) return true;
  if (norm.startsWith('inspecting asset')) return true;
  if (norm.startsWith('captured asset')) return true;
  if (norm === 'physical asset') return true;
  return false;
}

function tokenizeSignificant(text: string): string[] {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'pack', 'unit', 'units', 'box', 'new']);
  return normalizeText(text)
    .split(' ')
    .filter((tok) => tok.length >= 2 && !stopWords.has(tok));
}

/**
 * Evaluates whether a candidate scanned item matches any existing item in the user's inventory
 * via:
 * 1) Exact or visually similar image match
 * 2) Exact barcode match
 * 3) Product name + brand match
 */
export function findDuplicateInventoryItem(
  candidate: {
    productName: string;
    brand: string;
    barcode: string;
    imageUrl?: string | null;
  },
  existingItems: InventoryItem[],
  candidateImageHash?: string,
  existingImageHashes?: Record<string, string>
): DuplicateMatchResult | null {
  if (!existingItems || existingItems.length === 0) return null;

  // 1. Check Exact Image Match or Perceptual Visual Image Match first
  if (candidate.imageUrl) {
    for (const item of existingItems) {
      if (item.imageUrl && item.imageUrl === candidate.imageUrl) {
        return {
          matchedItem: item,
          matchReason: 'Exact Image Match',
          confidenceLabel: '100% Identical Photo',
        };
      }
      if (
        candidateImageHash &&
        existingImageHashes &&
        existingImageHashes[item.id] &&
        areImageHashesSimilar(candidateImageHash, existingImageHashes[item.id])
      ) {
        return {
          matchedItem: item,
          matchReason: 'Visually Similar Image Match',
          confidenceLabel: 'High Visual Similarity',
        };
      }
    }
  }

  // 2. Check Barcode Match (when barcode is present and not N/A)
  const cleanBarcode = normalizeText(candidate.barcode);
  if (
    cleanBarcode &&
    cleanBarcode !== 'n a' &&
    cleanBarcode !== 'na' &&
    cleanBarcode !== 'none' &&
    cleanBarcode !== 'unknown' &&
    cleanBarcode.length >= 4
  ) {
    for (const item of existingItems) {
      const itemBarcode = normalizeText(item.barcode);
      if (itemBarcode && itemBarcode === cleanBarcode) {
        return {
          matchedItem: item,
          matchReason: 'Barcode Match',
          confidenceLabel: `Barcode #${candidate.barcode.trim()}`,
        };
      }
    }
  }

  // 3. Check Product Name & Brand Match
  if (!isPlaceholderName(candidate.productName)) {
    const candName = normalizeText(candidate.productName);
    const candBrand = normalizeText(candidate.brand);
    const candTokens = tokenizeSignificant(`${candBrand} ${candName}`);

    for (const item of existingItems) {
      const itemName = normalizeText(item.name);
      const itemBrand = normalizeText(item.brand || item.subname?.split('·')[0] || '');
      if (!itemName) continue;

      // Exact normalized product name match
      if (candName === itemName) {
        return {
          matchedItem: item,
          matchReason: 'Product Name & Brand Match',
          confidenceLabel: 'Exact Product Name Match',
        };
      }

      // Substring match when product name is specific (>= 6 chars) and brand aligns
      const brandAligned =
        !candBrand ||
        !itemBrand ||
        candBrand === itemBrand ||
        candBrand.includes(itemBrand) ||
        itemBrand.includes(candBrand) ||
        candName.includes(itemBrand) ||
        itemName.includes(candBrand);

      if (
        brandAligned &&
        candName.length >= 6 &&
        itemName.length >= 6 &&
        (candName.includes(itemName) || itemName.includes(candName))
      ) {
        return {
          matchedItem: item,
          matchReason: 'Product Name & Brand Match',
          confidenceLabel: 'Matching Product & Brand',
        };
      }

      // Token overlap similarity (e.g., "Apple MacBook Air" vs "MacBook Air M2")
      const itemTokens = tokenizeSignificant(`${itemBrand} ${itemName}`);
      if (candTokens.length >= 2 && itemTokens.length >= 2 && brandAligned) {
        const setA = new Set(candTokens);
        const setB = new Set(itemTokens);
        let intersection = 0;
        setA.forEach((t) => {
          if (setB.has(t)) intersection++;
        });
        const minLen = Math.min(setA.size, setB.size);
        const overlapRatio = intersection / minLen;
        if (overlapRatio >= 0.75 && intersection >= 2) {
          return {
            matchedItem: item,
            matchReason: 'Product Name & Brand Match',
            confidenceLabel: 'Similar Product & Brand',
          };
        }
      }
    }
  }

  return null;
}

/**
 * Parses an item's existing quantity string (e.g. "1 Unit", "2 Units", "30 Tablets")
 * and computes the updated quantity label when adding `unitsToAdd` more items/packs.
 */
export function computeIncrementedQuantity(
  existingQuantity: string | undefined,
  unitsToAdd: number
): QuantityIncrementPreview {
  const safeAdd = Math.max(1, Math.round(unitsToAdd));
  const raw = (existingQuantity || '1 Unit').trim();

  // Match leading number + unit text, e.g. "1 Unit", "30 Tablets", "2 Packs"
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) {
    const newTotal = 1 + safeAdd;
    return {
      previousLabel: raw,
      newLabel: `${newTotal} Units`,
      previousNumeric: 1,
      newNumeric: newTotal,
      unitSuffix: 'Units',
      stepSize: 1,
    };
  }

  const baseNumber = parseFloat(match[1]) || 1;
  let unitRaw = (match[2] || 'Unit').trim();

  // Determine if the quantity is a pack size (like "30 Tablets", "60 Capsules", "100 ml")
  // or a direct unit count ("1 Unit", "2 Units", "1 Piece")
  const isDirectUnit = /^(unit|units|pc|pcs|piece|pieces|item|items|box|boxes|pack|packs)$/i.test(unitRaw) || !unitRaw;

  if (isDirectUnit) {
    const newCount = baseNumber + safeAdd;
    let formattedUnit = unitRaw || 'Unit';
    if (/^unit$/i.test(formattedUnit) && newCount > 1) {
      formattedUnit = 'Units';
    } else if (/^piece$/i.test(formattedUnit) && newCount > 1) {
      formattedUnit = 'Pieces';
    } else if (/^box$/i.test(formattedUnit) && newCount > 1) {
      formattedUnit = 'Boxes';
    } else if (/^pack$/i.test(formattedUnit) && newCount > 1) {
      formattedUnit = 'Packs';
    }
    return {
      previousLabel: raw,
      newLabel: `${newCount} ${formattedUnit}`.trim(),
      previousNumeric: baseNumber,
      newNumeric: newCount,
      unitSuffix: formattedUnit,
      stepSize: 1,
    };
  }

  // For pack quantities like "30 Tablets", each +1 item scanned adds another pack of that size (or +1 unit if baseNumber === 1)
  const step = baseNumber > 1 ? baseNumber : 1;
  const newCount = baseNumber + step * safeAdd;
  return {
    previousLabel: raw,
    newLabel: `${newCount} ${unitRaw}`.trim(),
    previousNumeric: baseNumber,
    newNumeric: newCount,
    unitSuffix: unitRaw,
    stepSize: step,
  };
}
