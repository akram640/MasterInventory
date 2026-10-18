import { auth } from './firebase.ts';
import { InventoryItem, ArchiveItem } from '../types/inventory.ts';

async function getHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
  };

  // Wait briefly for Firebase Auth state restoration on initial page load
  try {
    if (typeof auth.authStateReady === 'function') {
      await Promise.race([
        auth.authStateReady(),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    }
  } catch {
    // ignore
  }

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-user-uid'] = auth.currentUser.uid;
      if (auth.currentUser.email) {
        headers['x-user-email'] = auth.currentUser.email;
      }
    } catch (err) {
      console.warn('Could not get Firebase ID token:', err);
    }
  }

  // Also attach session user UID/email from localStorage if available
  if (!headers['x-user-uid']) {
    try {
      const rawSession = localStorage.getItem('omnivault_session_user');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.uid) headers['x-user-uid'] = String(parsed.uid);
        if (parsed?.email) headers['x-user-email'] = String(parsed.email);
      }
    } catch {
      // ignore
    }
  }

  return headers;
}

export async function syncUserWithPostgres(user: { uid: string; email?: string; displayName?: string; photoURL?: string }) {
  try {
    const headers = await getHeaders();
    const res = await fetch('/api/auth/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(user),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('PostgreSQL user sync warning:', err);
  }
  return null;
}

export async function fetchPostgresInventory(): Promise<InventoryItem[] | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`/api/inventory?_t=${Date.now()}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('PostgreSQL fetch inventory error:', err);
    return null;
  }
}

export async function savePostgresInventoryItem(item: InventoryItem): Promise<boolean> {
  try {
    const headers = await getHeaders();
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });
    return res.ok;
  } catch (err) {
    console.warn('PostgreSQL save item error:', err);
    return false;
  }
}

export async function deletePostgresInventoryItem(itemId: string): Promise<boolean> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`/api/inventory/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('PostgreSQL delete item error:', err);
    return false;
  }
}

export async function fetchPostgresArchive(): Promise<ArchiveItem[] | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`/api/archive?_t=${Date.now()}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('PostgreSQL fetch archive error:', err);
    return null;
  }
}

export async function savePostgresArchiveItem(item: ArchiveItem): Promise<boolean> {
  try {
    const headers = await getHeaders();
    const res = await fetch('/api/archive', {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });
    return res.ok;
  } catch (err) {
    console.warn('PostgreSQL save archive record error:', err);
    return false;
  }
}

export async function deletePostgresArchiveItem(itemId: string): Promise<boolean> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`/api/archive/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('PostgreSQL delete archive record error:', err);
    return false;
  }
}

export async function purgeAllPostgresArchive(): Promise<boolean> {
  try {
    const headers = await getHeaders();
    const res = await fetch('/api/archive', {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('PostgreSQL purge archive error:', err);
    return false;
  }
}

export interface AIItemAnalysisResult {
  serialNo?: string;
  category?: string;
  subCategory?: string;
  productName?: string;
  description?: string;
  brand?: string;
  barcode?: string;
  quantity?: string;
  boxNo?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  priceSource?: string;
  condition?: string;
  notes?: string;
}

export async function analyzeItemWithAI(imageData: string, currentCount: number = 0): Promise<AIItemAnalysisResult | null> {
  try {
    const res = await fetch('/api/ai/analyze-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData, currentCount }),
    });

    if (!res.ok) {
      console.warn('AI analysis API returned non-OK status:', res.status);
      return null;
    }

    const json = await res.json();
    return json?.data || null;
  } catch (err) {
    console.error('Failed to analyze item with AI:', err);
    return null;
  }
}

export interface AssetImageMetaResponse {
  success: boolean;
  itemId: string;
  imageUrl: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  isHighRes: boolean;
}

export async function savePostgresAssetImage(
  itemId: string,
  payload: {
    imageData: string;
    mimeType?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
  }
): Promise<boolean> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`/api/images/${encodeURIComponent(itemId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('PostgreSQL save high-res image error:', err);
    return false;
  }
}

export async function fetchPostgresAssetImageMeta(
  itemId: string
): Promise<AssetImageMetaResponse | null> {
  try {
    const res = await fetch(`/api/images/${encodeURIComponent(itemId)}?format=json`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('PostgreSQL fetch high-res image error:', err);
    return null;
  }
}

