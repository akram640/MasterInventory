import { auth } from './firebase.ts';
import { InventoryItem, ArchiveItem } from '../types/inventory.ts';

async function getHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('Could not get Firebase ID token:', err);
    }
  }

  return headers;
}

export async function syncUserWithPostgres(user: { uid: string; email?: string; displayName?: string; photoURL?: string }) {
  try {
    const headers = await getHeaders();
    await fetch('/api/auth/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(user),
    });
  } catch (err) {
    console.warn('PostgreSQL user sync warning:', err);
  }
}

export async function fetchPostgresInventory(): Promise<InventoryItem[] | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch('/api/inventory', { headers });
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
    const res = await fetch('/api/archive', { headers });
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
