export interface DualResolutionImageResult {
  thumbnailUrl: string;
  highResDataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Splits a raw captured or uploaded data URL into:
 * 1. A lightweight 480px JPEG thumbnail for fast inventory list rendering & Firestore sync.
 * 2. A crisp 1600px HD master JPEG for dedicated storage in PostgreSQL `asset_images`.
 */
export function prepareDualResolutionImage(
  sourceDataUrl: string
): Promise<DualResolutionImageResult> {
  return new Promise((resolve) => {
    if (!sourceDataUrl || !sourceDataUrl.startsWith('data:image/')) {
      resolve({
        thumbnailUrl: sourceDataUrl,
        highResDataUrl: sourceDataUrl,
        width: 0,
        height: 0,
        sizeBytes: 0,
      });
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width || 800;
        const origH = img.naturalHeight || img.height || 800;

        // 1. Build 480px thumbnail for inventory_items.image_url
        const thumbMax = 480;
        const thumbScale = Math.min(1, thumbMax / Math.max(origW, origH));
        const thumbW = Math.max(1, Math.round(origW * thumbScale));
        const thumbH = Math.max(1, Math.round(origH * thumbScale));

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d');
        let thumbnailUrl = sourceDataUrl;
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, thumbW, thumbH);
          thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.78);
        }

        // 2. Build 1600px HD master for PostgreSQL asset_images table
        const hdMax = 1600;
        const hdScale = Math.min(1, hdMax / Math.max(origW, origH));
        const hdW = Math.max(1, Math.round(origW * hdScale));
        const hdH = Math.max(1, Math.round(origH * hdScale));

        const hdCanvas = document.createElement('canvas');
        hdCanvas.width = hdW;
        hdCanvas.height = hdH;
        const hdCtx = hdCanvas.getContext('2d');
        let highResDataUrl = sourceDataUrl;
        if (hdCtx) {
          hdCtx.drawImage(img, 0, 0, hdW, hdH);
          highResDataUrl = hdCanvas.toDataURL('image/jpeg', 0.9);
        }

        const sizeBytes = Math.round((highResDataUrl.length * 3) / 4);

        resolve({
          thumbnailUrl,
          highResDataUrl,
          width: hdW,
          height: hdH,
          sizeBytes,
        });
      } catch {
        resolve({
          thumbnailUrl: sourceDataUrl,
          highResDataUrl: sourceDataUrl,
          width: 0,
          height: 0,
          sizeBytes: Math.round((sourceDataUrl.length * 3) / 4),
        });
      }
    };

    img.onerror = () => {
      resolve({
        thumbnailUrl: sourceDataUrl,
        highResDataUrl: sourceDataUrl,
        width: 0,
        height: 0,
        sizeBytes: 0,
      });
    };

    img.src = sourceDataUrl;
  });
}
