export interface ResolvedGeoLocation {
  formattedAddress: string;
  lat?: number;
  lon?: number;
  source: 'exif' | 'browser-gps' | 'ip-fallback';
}

function dedupeAddressParts(parts: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    const trimmed = part.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Reverse-geocodes latitude & longitude into "Street, neighborhood, city, and state"
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number
): Promise<string> {
  try {
    const res = await fetch(
      `/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.formattedAddress) {
        return data.formattedAddress;
      }
    }
  } catch {
    // Fallback to client-side BigDataCloud if server route unreachable
  }

  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdc = await bdcRes.json();
      const adminList = bdc?.localityInfo?.administrative || [];
      const neighborhood =
        adminList.length > 0 ? adminList[adminList.length - 1]?.name : undefined;
      const parts = dedupeAddressParts([
        neighborhood,
        bdc.locality,
        bdc.city,
        bdc.principalSubdivision,
      ]);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch {
    // Ignore client fallback error
  }

  return `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
}

/**
 * Lightweight binary EXIF GPS extractor for JPEG files when a user takes/uploads a photo.
 * Extracts GPSLatitude (0x0002), GPSLatitudeRef (0x0001), GPSLongitude (0x0004), GPSLongitudeRef (0x0003).
 */
export async function extractExifGpsFromFile(
  file: File
): Promise<{ lat: number; lon: number } | null> {
  try {
    const slice = file.slice(0, 131072); // First 128KB contains EXIF APP1 header
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
      return null; // Not a JPEG
    }

    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        const length = view.getUint16(offset, false);
        if (offset + 8 >= view.byteLength) return null;
        // Check "Exif\0\0"
        const exifHeader = view.getUint32(offset + 2, false);
        if (exifHeader === 0x45786966 && view.getUint16(offset + 6, false) === 0x0000) {
          const tiffStart = offset + 8;
          const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
          const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
          const ifd0Ptr = tiffStart + firstIfdOffset;
          if (ifd0Ptr + 2 >= view.byteLength) return null;

          const entriesCount = view.getUint16(ifd0Ptr, littleEndian);
          let gpsIfdOffset = 0;

          for (let i = 0; i < entriesCount; i++) {
            const entryOffset = ifd0Ptr + 2 + i * 12;
            if (entryOffset + 12 > view.byteLength) break;
            const tag = view.getUint16(entryOffset, littleEndian);
            if (tag === 0x8825) {
              // GPSInfoIFDPointer
              gpsIfdOffset = view.getUint32(entryOffset + 8, littleEndian);
              break;
            }
          }

          if (!gpsIfdOffset) return null;
          const gpsPtr = tiffStart + gpsIfdOffset;
          if (gpsPtr + 2 >= view.byteLength) return null;

          const gpsEntries = view.getUint16(gpsPtr, littleEndian);
          let latRef = 'N';
          let lonRef = 'E';
          let latValues: number[] | null = null;
          let lonValues: number[] | null = null;

          const readThreeRationals = (valOffset: number): number[] | null => {
            const abs = tiffStart + valOffset;
            if (abs + 24 > view.byteLength) return null;
            const res: number[] = [];
            for (let k = 0; k < 3; k++) {
              const num = view.getUint32(abs + k * 8, littleEndian);
              const den = view.getUint32(abs + k * 8 + 4, littleEndian);
              res.push(den ? num / den : 0);
            }
            return res;
          };

          for (let i = 0; i < gpsEntries; i++) {
            const entry = gpsPtr + 2 + i * 12;
            if (entry + 12 > view.byteLength) break;
            const tag = view.getUint16(entry, littleEndian);
            if (tag === 0x0001) {
              const charCode = view.getUint8(entry + 8);
              if (charCode === 83) latRef = 'S';
            } else if (tag === 0x0002) {
              const valOffset = view.getUint32(entry + 8, littleEndian);
              latValues = readThreeRationals(valOffset);
            } else if (tag === 0x0003) {
              const charCode = view.getUint8(entry + 8);
              if (charCode === 87) lonRef = 'W';
            } else if (tag === 0x0004) {
              const valOffset = view.getUint32(entry + 8, littleEndian);
              lonValues = readThreeRationals(valOffset);
            }
          }

          if (latValues && lonValues) {
            let lat = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
            let lon = lonValues[0] + lonValues[1] / 60 + lonValues[2] / 3600;
            if (latRef === 'S') lat = -lat;
            if (lonRef === 'W') lon = -lon;
            if (!Number.isNaN(lat) && !Number.isNaN(lon) && (lat !== 0 || lon !== 0)) {
              return { lat, lon };
            }
          }
        }
        offset += length;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        const segLen = view.getUint16(offset, false);
        offset += segLen;
      }
    }
  } catch {
    // Ignore EXIF parse errors
  }
  return null;
}

/**
 * Acquires current device GPS coordinates via browser Geolocation API
 */
export function getBrowserCoordinates(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (coords: { lat: number; lon: number } | null) => {
      if (!settled) {
        settled = true;
        resolve(coords);
      }
    };

    // High-accuracy GPS attempt first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        finish({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        // Fallback to low-accuracy / cached network location
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            finish({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
          },
          () => finish(null),
          { enableHighAccuracy: false, timeout: 4500, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );

    setTimeout(() => finish(null), 10000);
  });
}

/**
 * Resolves the human-readable "Street, neighborhood, city, and state" Geo Location
 * for a captured or uploaded asset photo.
 */
export async function detectAssetGeoLocation(
  photoFile?: File | null
): Promise<ResolvedGeoLocation | null> {
  // 1. If a photo File was provided, check embedded EXIF GPS first
  if (photoFile) {
    const exifCoords = await extractExifGpsFromFile(photoFile);
    if (exifCoords) {
      const formattedAddress = await reverseGeocodeCoordinates(
        exifCoords.lat,
        exifCoords.lon
      );
      return {
        formattedAddress,
        lat: exifCoords.lat,
        lon: exifCoords.lon,
        source: 'exif',
      };
    }
  }

  // 2. Query browser / phone GPS coordinates
  const browserCoords = await getBrowserCoordinates();
  if (browserCoords) {
    const formattedAddress = await reverseGeocodeCoordinates(
      browserCoords.lat,
      browserCoords.lon
    );
    return {
      formattedAddress,
      lat: browserCoords.lat,
      lon: browserCoords.lon,
      source: 'browser-gps',
    };
  }

  // 3. Fallback to BigDataCloud client locality if browser GPS permission is blocked in iframe
  try {
    const bdcRes = await fetch(
      'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en'
    );
    if (bdcRes.ok) {
      const bdc = await bdcRes.json();
      const parts = dedupeAddressParts([
        bdc.locality,
        bdc.city,
        bdc.principalSubdivision,
      ]);
      if (parts.length > 0) {
        return {
          formattedAddress: parts.join(', '),
          lat: bdc.latitude,
          lon: bdc.longitude,
          source: 'ip-fallback',
        };
      }
    }
  } catch {
    // Ignore fallback error
  }

  return null;
}
