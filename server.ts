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
} from './src/db/inventory.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '15mb' }));

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
Carefully inspect the provided photograph or screenshot of this physical item, product packaging, pharmaceutical bottle, home appliance, electronic device, or retail tag.
Extract accurate metadata and estimate its Indian market valuation into clean structured JSON.

Rules:
1. "serialNo": Provide a sequential serial or extract any visible serial number, model number, or manufacturing code. Default to "${currentCount + 1}" if not visible.
2. "category": Broad taxonomy. For supplements, medicines, vitamins use "Health & Wellness" or "Medicine". For washing machines, refrigerators, kitchen equipment use "Home Appliances". For gadgets, audio, laptops use "Electronics". Other allowed: "Wardrobe & Apparel", "Home & Furniture", "Vehicles & Mobility", "Documents & Valuables".
3. "subCategory": Precise sub-category (e.g., "Dietary Supplements / Hair & Skin Care", "Large Appliances / Laundry", "Audio & Wearables").
4. "productName": Full official name of the product (e.g., "Cutihance Men Tablets", "Whirlpool 7 kg 5 Star Fully Automatic Top Load Washing Machine (Whitemagic Elite)").
5. "description": Detailed description highlighting key specifications, active ingredients (e.g. Evening Primrose Oil, multivitamin, multimineral, amino acids, beta-sitosterol, grape seed extract), or technical features (e.g. 5-star energy rating, 6th Sense Spa Wash, ZPF technology).
6. "brand": Brand name (e.g. "Cutihance", "Whirlpool", "Sony", "Philips").
7. "barcode": Numerical barcode digits if visible, otherwise "N/A".
8. "quantity": Quantity/pack size (e.g. "30 Tablets", "1 Unit", "60 Capsules", "500 ml").
9. "boxNo": Storage box/shelf location if indicated, else "N/A".
10. "expiryDate": Expiration date if printed/visible, else "N/A".
11. "purchaseDate": Purchase date if visible on receipt/screen, else "N/A".
12. "purchasePrice": Numeric value in Indian Rupee (₹ INR). If visible on the image (e.g. Croma price ₹16,300, Amazon.in price, or printed MRP), use it. If not explicitly on label, estimate prevailing retail price in India (e.g. 16300 for 7kg washing machine, or standard INR market price for vitamins/supplements). Return 0 only if completely unknown.
13. "priceSource": Source of price (e.g. "Croma listed price", "Amazon.in price", "Printed MRP", "Estimated Indian Market Retail Price").
14. "condition": "New / Unopened", "Gently Used", or "Good".
15. "notes": Useful tips or recommendations (e.g. "Hair fall support, suggested by dermatologist. Gluten-free.", or "Bought for the home laundry setup. Energy efficient (5 Star rating).")

Exemplars to follow:
Example 1:
- serialNo: "1"
- category: "Health & Wellness"
- subCategory: "Dietary Supplements / Hair & Skin Care"
- productName: "Cutihance Men Tablets"
- description: "Nutraceutical supplement with Evening Primrose Oil, multivitamin, multimineral, amino acids, beta-sitosterol, and grape seed extract to support hair, skin, and overall wellness."
- brand: "Cutihance"
- barcode: "N/A"
- quantity: "30 Tablets"
- boxNo: "N/A"
- expiryDate: "N/A"
- purchaseDate: "N/A"
- purchasePrice: 0
- priceSource: "Estimated Indian Market Retail Price"
- condition: "New / Unopened"
- notes: "Hair fall support, suggested by dermatologist. Gluten-free."

Example 2:
- serialNo: "2"
- category: "Home Appliances"
- subCategory: "Large Appliances / Laundry"
- productName: "Whirlpool 7 kg 5 Star Fully Automatic Top Load Washing Machine (Whitemagic Elite)"
- description: "7 kg capacity top-load fully automatic washing machine featuring a 5-star energy rating, 6th Sense Spa Wash system, and ZPF technology for low water pressure filling."
- brand: "Whirlpool"
- barcode: "N/A"
- quantity: "1 Unit"
- boxNo: "N/A"
- expiryDate: "N/A"
- purchaseDate: "N/A"
- purchasePrice: 16300
- priceSource: "Croma listed price"
- condition: "New / Unopened"
- notes: "Bought for the home laundry setup. Energy efficient (5 Star rating)."

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
  "purchaseDate": string,
  "purchasePrice": number,
  "priceSource": string,
  "condition": string,
  "notes": string
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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

      const responseText = response.text || '{}';
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

      // Ensure user exists first
      await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);

      const items = await getUserInventory(uid);
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

      await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const saved = await upsertInventoryItem(uid, item);
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

      await deleteInventoryItem(uid, itemId);
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

      await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const items = await getUserArchive(uid);
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

      await getOrCreateUser(uid, req.user?.email || `${uid}@omnivault.internal`);
      const saved = await upsertArchiveItem(uid, item);
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

      await deleteArchiveItem(uid, itemId);
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

      await purgeAllUserArchive(uid);
      res.json({ success: true, message: 'Archive cleared' });
    } catch (err: unknown) {
      console.error('Error purging archive from PostgreSQL:', err);
      res.status(500).json({ error: 'Failed to empty archive in PostgreSQL' });
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
