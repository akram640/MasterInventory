import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  getUserInventory,
  upsertInventoryItem,
  deleteInventoryItem,
  getUserArchive,
  upsertArchiveItem,
  deleteArchiveItem,
  purgeAllUserArchive,
  getAssetImage,
  upsertAssetImage,
} from './src/db/inventory.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '30mb' }));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'online',
      database: 'PostgreSQL (Cloud SQL)',
      timestamp: new Date().toISOString(),
    });
  });

  // AI Vision analysis of captured photo / uploaded image
  app.post('/api/ai/analyze-item', async (req: Request, res: Response) => {
    try {
      const { image, currentCount = 0 } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image provided for AI analysis' });
      }

      // Extract base64 payload and mimeType
      let mimeType = 'image/jpeg';
      let base64Data = image;
      if (typeof image === 'string' && image.startsWith('data:')) {
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY is not set on server');
        return res.json({
          success: true,
          data: {
            serialNo: String(currentCount + 1),
            category: 'Health & Wellness',
            subCategory: 'General Items',
            productName: `Vault Ingest #${currentCount + 1}`,
            description: 'Captured physical object item.',
            brand: 'Identified Asset',
            barcode: 'N/A',
            quantity: '1 Unit',
            boxNo: 'N/A',
            expiryDate: 'N/A',
            manufacturingDate: 'N/A',
            purchaseDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            purchasePrice: 0,
            priceSource: 'Manual Entry',
            condition: 'New / Unopened',
            notes: 'Processed by OmniVault'
          }
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `You are OmniVault AI, an elite visual cataloging and asset indexing specialist.
Carefully inspect the provided photograph or screenshot of this physical item, product packaging, pharmaceutical bottle, home appliance, induction cooktop, electronic device, or retail tag.
Extract accurate metadata and estimate its Indian market valuation into clean structured JSON.

Rules:
1. "serialNo": Provide a sequential serial or extract any visible serial number, model number, or manufacturing code. Default to "${currentCount + 1}" if not visible.
2. "category": Broad taxonomy. Must be one of: "Medicine & Health", "Home Appliances", "Electronics", "Personal Care", "Food & Beverage", "Apparel", "Home & Living", "Documents". (For induction cooktops, washing machines, refrigerators, kitchen appliances use "Home Appliances". For supplements, medicines, vitamins use "Medicine & Health". For gadgets, audio, laptops use "Electronics".)
3. "subCategory": Precise sub-category (e.g., "Kitchen Appliances / Induction Cooktop", "Dietary Supplements / Hair & Skin Care", "Large Appliances / Laundry", "Audio & Wearables").
4. "productName": Full official name of the product (e.g., "Philips Viva Collection HD4928/01 2100-Watt Induction Cooktop", "Cutihance Men Tablets", "Whirlpool 7 kg 5 Star Fully Automatic Top Load Washing Machine (Whitemagic Elite)").
5. "description": Detailed description highlighting key specifications, wattage/controls, active ingredients, or technical features.
6. "brand": Brand name (e.g. "Philips", "Cutihance", "Whirlpool", "Sony", "Prestige").
7. "barcode": Numerical barcode digits or model/lot number if visible, otherwise "N/A".
8. "quantity": Quantity/pack size (e.g. "1 Unit", "30 Tablets", "60 Capsules", "500 ml").
9. "boxNo": Storage box/shelf location if indicated, else "N/A".
10. "expiryDate": Expiration / Best Before date if printed/visible (e.g. for medicines, supplements, food products), else "N/A".
11. "manufacturingDate": Manufacturing / MFD / Packed date if printed/visible on label or appliance plate, else "N/A".
12. "purchaseDate": Purchase date (date of asset ownership) if visible on receipt/screen, else "N/A".
13. "purchasePrice": Numeric value in Indian Rupee (₹ INR). If visible on the image, use it. If not explicitly on label, estimate prevailing retail price in India (e.g. 3200 for a Philips induction cooktop, 16300 for 7kg washing machine, or standard INR market price for medicines/supplements). Never return 0 if the item is recognizable.
14. "priceSource": Source of price (e.g. "Estimated Indian Market Retail Price", "Croma listed price", "Amazon.in price", "Printed MRP").
15. "condition": "New / Unopened", "Good / Pristine", or "Gently Used".
16. "notes": Useful tips, usage details, or care recommendations.

Return strictly a JSON object matching this structure:
{
  "serialNo": string,
  "category": string,
  "subCategory": string,
  "productName": string,
  "description": string,
  "brand": string,
  "barcode": string,
  "quantity": string,
  "boxNo": string,
  "expiryDate": string,
  "manufacturingDate": string,
  "purchaseDate": string,
  "purchasePrice": number,
  "priceSource": string,
  "condition": string,
  "notes": string
}`;

      // Try models in order so per-model free tier quota limits (20 RPD per model) seamlessly fall over
      const candidateModels = [
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
      ];

      let responseText = '';
      let lastError: unknown = null;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (modelErr: unknown) {
          lastError = modelErr;
          console.warn(`Model ${modelName} failed or hit quota, trying next candidate...`, String(modelErr).slice(0, 200));
        }
      }

      if (!responseText) {
        throw lastError || new Error('All candidate Gemini vision models failed');
      }

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      res.json({ success: true, data: parsedData });
    } catch (err: unknown) {
      console.error('Error during AI Vision analysis:', err);
      res.status(500).json({ error: 'AI item analysis failed', details: String(err) });
    }
  });

  // Sync / verify user profile in PostgreSQL
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || req.body?.email || `${uid}@omnivault.internal`;
      const displayName = req.user?.name || req.body?.displayName;
      const photoUrl = req.user?.picture || req.body?.photoURL;

      if (!uid) {
        return res.status(400).json({ error: 'Missing UID' });
      }

      const dbUser = await getOrCreateUser(uid, email, displayName, photoUrl);
      res.json({ success: true, user: dbUser });
    } catch (err: unknown) {
      console.error('Error syncing user with PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to sync user profile with database' });
    }
  });

  // GET inventory for authenticated user from PostgreSQL
  app.get('/api/inventory', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: 'Unauthorized' });

      const dbUser = await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const canonicalUid = dbUser?.uid || uid;

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const items = await getUserInventory(canonicalUid);
      res.json(items);
    } catch (err: unknown) {
      console.error('Error fetching inventory from PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to query inventory from PostgreSQL' });
    }
  });

  // POST/PUT save inventory item to PostgreSQL
  app.post('/api/inventory', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: 'Unauthorized' });

      const item = req.body;
      if (!item || !item.id || !item.name) {
        return res.status(400).json({ error: 'Invalid inventory item payload' });
      }

      const dbUser = await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const canonicalUid = dbUser?.uid || uid;

      const saved = await upsertInventoryItem(canonicalUid, item);
      res.json({ success: true, item: saved });
    } catch (err: unknown) {
      console.error('Error saving item to PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to save item to PostgreSQL' });
    }
  });

  // DELETE inventory item from PostgreSQL
  app.delete('/api/inventory/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      const itemId = req.params.id;
      if (!uid || !itemId) return res.status(400).json({ error: 'Missing parameters' });

      const dbUser = await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const canonicalUid = dbUser?.uid || uid;

      await deleteInventoryItem(canonicalUid, itemId);
      res.json({ success: true, deletedId: itemId });
    } catch (err: unknown) {
      console.error('Error deleting item from PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to delete item from PostgreSQL' });
    }
  });

  // GET archive records from PostgreSQL
  app.get('/api/archive', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: 'Unauthorized' });

      const dbUser = await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const canonicalUid = dbUser?.uid || uid;

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const items = await getUserArchive(canonicalUid);
      res.json(items);
    } catch (err: unknown) {
      console.error('Error fetching archive from PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to query archive from PostgreSQL' });
    }
  });

  // POST save archive record to PostgreSQL
  app.post('/api/archive', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: 'Unauthorized' });

      const item = req.body;
      if (!item || !item.id) {
        return res.status(400).json({ error: 'Invalid archive payload' });
      }

      const dbUser = await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const canonicalUid = dbUser?.uid || uid;

      const saved = await upsertArchiveItem(canonicalUid, item);
      res.json({ success: true, item: saved });
    } catch (err: unknown) {
      console.error('Error saving archive record to PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to save record to PostgreSQL' });
    }
  });

  // DELETE single archive record from PostgreSQL
  app.delete('/api/archive/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      const itemId = req.params.id;
      if (!uid || !itemId) return res.status(400).json({ error: 'Missing parameters' });

      const dbUser = await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const canonicalUid = dbUser?.uid || uid;

      await deleteArchiveItem(canonicalUid, itemId);
      res.json({ success: true, deletedId: itemId });
    } catch (err: unknown) {
      console.error('Error deleting archive record from PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to purge record from PostgreSQL' });
    }
  });

  // DELETE all archive records for user from PostgreSQL
  app.delete('/api/archive', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: 'Unauthorized' });

      const dbUser = await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const canonicalUid = dbUser?.uid || uid;

      await purgeAllUserArchive(canonicalUid);
      res.json({ success: true, message: 'Archive cleared' });
    } catch (err: unknown) {
      console.error('Error purging archive from PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to empty archive in PostgreSQL' });
    }
  });

  // GET high-resolution asset image from dedicated PostgreSQL asset_images table
  app.get('/api/images/:itemId', async (req: Request, res: Response) => {
    try {
      const itemId = req.params.itemId;
      if (!itemId) return res.status(400).json({ error: 'Missing itemId' });

      const record = await getAssetImage(itemId);
      if (!record || !record.imageData) {
        return res.status(404).json({ error: 'Asset image not found' });
      }

      // Support JSON metadata + data URL lookup if requested via ?format=json
      if (req.query.format === 'json') {
        return res.json({
          success: true,
          itemId: record.itemId,
          imageUrl: record.imageData,
          mimeType: record.mimeType,
          width: record.width,
          height: record.height,
          sizeBytes: record.sizeBytes,
          isHighRes: record.isHighRes,
        });
      }

      // Serve binary image stream when accessed directly via <img src="/api/images/:itemId"> or download link
      if (record.imageData.startsWith('data:')) {
        const matches = record.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1] || record.mimeType || 'image/jpeg';
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.send(buffer);
        }
      }

      if (record.imageData.startsWith('http://') || record.imageData.startsWith('https://')) {
        return res.redirect(record.imageData);
      }

      const buffer = Buffer.from(record.imageData, 'base64');
      res.setHeader('Content-Type', record.mimeType || 'image/jpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
    } catch (err: unknown) {
      console.error('Error serving asset image from PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to load asset image' });
    }
  });

  // POST save/update high-resolution asset image in PostgreSQL asset_images table
  app.post('/api/images/:itemId', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user?.uid;
      const itemId = req.params.itemId;
      if (!uid || !itemId) return res.status(401).json({ error: 'Unauthorized' });

      const { imageData, mimeType, width, height, sizeBytes } = req.body || {};
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: 'Missing imageData payload' });
      }

      await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const ok = await upsertAssetImage(uid, {
        itemId,
        imageData,
        mimeType,
        width,
        height,
        sizeBytes,
      });

      res.json({
        success: ok,
        itemId,
        imageUrl: `/api/images/${encodeURIComponent(itemId)}`,
      });
    } catch (err: unknown) {
      console.error('Error saving high-res asset image to PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to save high-res asset image' });
    }
  });

  // GET reverse-geocode coordinates into human-readable "Street, neighborhood, city, and state"
  app.get('/api/reverse-geocode', async (req: Request, res: Response) => {
    try {
      const latRaw = req.query.lat ? Number(req.query.lat) : NaN;
      const lonRaw = req.query.lon ? Number(req.query.lon) : NaN;

      const dedupeParts = (parts: (string | undefined | null)[]) => {
        const seen = new Set<string>();
        const clean: string[] = [];
        for (const raw of parts) {
          if (!raw) continue;
          const trimmed = raw.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            clean.push(trimmed);
          }
        }
        return clean;
      };

      if (!Number.isNaN(latRaw) && !Number.isNaN(lonRaw)) {
        // 1. Primary: OpenStreetMap Nominatim (detailed street + neighborhood + city + state)
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
            latRaw
          )}&lon=${encodeURIComponent(lonRaw)}&zoom=18&addressdetails=1`;
          const nomRes = await fetch(nomUrl, {
            headers: {
              'User-Agent': 'OmniVaultAssetScanner/1.0 (https://ai.studio)',
              'Accept-Language': 'en',
            },
          });

          if (nomRes.ok) {
            const data = (await nomRes.json()) as {
              address?: Record<string, string>;
              name?: string;
            };
            const addr = data.address || {};
            const street =
              addr.road ||
              addr.pedestrian ||
              addr.footway ||
              addr.street ||
              addr. residential ||
              data.name;
            const neighborhood =
              addr.neighbourhood ||
              addr.suburb ||
              addr.quarter ||
              addr.city_district ||
              addr.hamlet ||
              addr.locality;
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.county ||
              addr.state_district;
            const state = addr.state || addr.region;

            const parts = dedupeParts([street, neighborhood, city, state]);
            if (parts.length > 0) {
              return res.json({
                success: true,
                formattedAddress: parts.join(', '),
                coordinates: { lat: latRaw, lon: lonRaw },
                source: 'gps-nominatim',
              });
            }
          }
        } catch (nomErr) {
          console.warn('Nominatim reverse geocode fallback trigger:', nomErr);
        }

        // 2. Secondary: BigDataCloud Reverse Geocode API
        try {
          const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
            latRaw
          )}&longitude=${encodeURIComponent(lonRaw)}&localityLanguage=en`;
          const bdcRes = await fetch(bdcUrl);
          if (bdcRes.ok) {
            const bdc = (await bdcRes.json()) as {
              locality?: string;
              city?: string;
              principalSubdivision?: string;
              localityInfo?: { administrative?: Array<{ name?: string; order?: number }> };
            };
            const adminList = bdc.localityInfo?.administrative || [];
            const subArea =
              adminList.length > 0 ? adminList[adminList.length - 1]?.name : undefined;
            const parts = dedupeParts([
              subArea,
              bdc.locality,
              bdc.city,
              bdc.principalSubdivision,
            ]);
            if (parts.length > 0) {
              return res.json({
                success: true,
                formattedAddress: parts.join(', '),
                coordinates: { lat: latRaw, lon: lonRaw },
                source: 'gps-bdc',
              });
            }
          }
        } catch (bdcErr) {
          console.warn('BigDataCloud reverse geocode error:', bdcErr);
        }

        return res.json({
          success: true,
          formattedAddress: `${latRaw.toFixed(4)}° N, ${lonRaw.toFixed(4)}° E`,
          coordinates: { lat: latRaw, lon: lonRaw },
          source: 'gps-coords',
        });
      }

      return res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
    } catch (err: unknown) {
      console.error('Reverse geocode error:', err);
      res.status(500).json({ error: 'Failed to resolve geo location' });
    }
  });

  // Mount Vite development server middleware in dev mode
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (PostgreSQL backend active)`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
