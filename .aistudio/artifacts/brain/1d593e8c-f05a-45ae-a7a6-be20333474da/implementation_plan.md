# Multimodal AI Vision Ingestion & Intelligent Auto-Fill Architecture

Implement a Gemini-powered visual intelligence pipeline in OmniVault that inspects physical camera captures and uploaded product screenshots, extracts structured inventory attributes (Serial No., Category, Sub-category, Brand, Quantity, Expiry, Condition, Description, and Notes), estimates real-time Indian retail market valuation via Google Search grounding, and presents an interactive verification form before persisting to the unified master database.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during the interactive Phase 1 consultation:
> - **Unified Master Schema**: The inventory database will maintain a single unified master table with comprehensive polymorphic columns and category attributes, avoiding siloed tables while preserving cross-category filtering, unified ledger telemetry, and searchability.
> - **AI Valuation with Google Search Grounding**: When item price is absent from packaging, Gemini will search Indian retail sources (e.g., Croma, Amazon.in, Flipkart, 1mg) to supply real-time ₹ INR price estimates with source provenance, while keeping the field fully editable by the user.
> - **Instant Verification Form**: Immediately upon optical capture, the app displays a full verification modal with live AI extraction badges, allowing the operator to review, tweak, and approve all extracted fields prior to vault persistence.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the OmniVault optical reticle camera from a basic photo-taker into an intelligent multimodal ingestion terminal. When the camera captures an object or packaging (such as pharmaceutical supplements, appliances, or electronics), the image is streamed to a secure server endpoint (`/api/ai/analyze-item`) running Gemini 3.8 Flash. The AI extracts 14 key asset attributes and estimates prevailing market prices in Indian Rupees (₹ INR).
- **Target Audience / Persona**: Personal inventory managers, collectors, and household operators who want frictionless, zero-typing digitization of their physical belongings.
- **Key Value**: Reduces cataloging time from minutes of manual typing to a 2-second snap-and-confirm workflow with zero error rate.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Optical Capture**: Operator points camera at an object or box (e.g., Cutihance Men bottle or Whirlpool washing machine) and taps the center shutter button (or uploads an image).
2. **AI Analysis State**: The captured frame shows an animated scanning reticle with non-blocking feedback: *"AI Multimodal Analysis & Market Price Discovery in progress..."*.
3. **Interactive Verification Form**: The Review Modal opens, showing:
   - High-resolution preview of the captured photo.
   - Auto-filled fields: **Serial No.**, **Product Name**, **Brand**, **Category**, **Sub-category**, **Quantity**, **Estimated Value (₹ INR)** with retail source tag, **Condition**, **Expiry Date**, **Box No**, **Description**, and **Notes**.
   - Visual indicator showing AI confidence and fields auto-detected.
   - Clean inline edit controls for every single field.
4. **Approval & Vault Ledger Ingest**: Operator reviews or edits any field and taps **"Save to Vault"**. The asset is written to PostgreSQL (Cloud SQL) and Firestore, updating the dashboard valuation and inventory tables instantly.

### Visual Identity & Theme
- **Aesthetic Direction**: High-density Swiss utilitarian and technical cataloging. Crisp white surfaces (`#FFFFFF`), muted cool structural borders (`#E3E1EC`), deep carbon typography (`#1A1B22`), and high-intent electric cobalt accents (`#0051D5`).
- **Typography & Hierarchy**:
  - Display & Headings: `Plus Jakarta Sans` (SemiBold / Bold).
  - Body & Form Controls: `DM Sans` / `Plus Jakarta Sans` (13px–14px, 1.5 line height).
  - Metrics, Currencies, and Serial Keys: Monospace tabular numerals (`font-mono tabular-nums`).
- **Zero-Pill Discipline**: Statuses and metadata use unboxed text with subtle typographic separators (`·` or `/`). No pill-badge sandwiches on cards or inputs.
- **Motion & Latency**: Camera shutter triggers haptic chime; AI analysis state settles with smooth opacity transitions ($\le 200\text{ms}$).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Unified Schema vs Separate Tables
- **Chosen Approach**: Expanded Unified Master Table (`inventory_items`) with rich typed columns for universal and category-specific attributes (quantity, brand, sub-category, notes, box number, description, estimated market price source).
- **Why**: Allows instant cross-category search, unified filtering by room/status, unified CSV/JSON export, and seamless dashboard aggregations without complex SQL `UNION` operations across fragmented tables.
- **Alternatives Considered**: Separate tables per category (e.g. `health_wellness_items`, `home_appliances_items`) were rejected because they fragment search, duplicate migration logic, break universal ID lookups, and complicate foreign-key relationships.

### Decision 2: Server-Side Gemini 3.8 Flash with Grounding
- **Chosen Approach**: Server-side proxy route `/api/ai/analyze-item` using `@google/genai` SDK with `gemini-3.8-flash`. Prompt includes structured schema output instructions and web-grounded Indian retail pricing heuristics.
- **Why**: Keeps API keys strictly server-side, executes in under 2 seconds, and provides native multimodal vision understanding of text, packaging barcodes, branding logos, and specs.
- **Alternatives Considered**: Client-side OCR (Tesseract.js) was rejected because it only reads raw text without semantic categorization, brand detection, or price lookup.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (REACT SPA)                            │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   CameraScreen.tsx    │             │   InventoryScreen.tsx      │  │
│  │  - Video Frame / File │             │  - Master Table & Grid     │  │
│  │  - Reticle Scanner    │             │  - Category Filter         │  │
│  └───────────┬───────────┘             └─────────────▲──────────────┘  │
│              │ Snapshot (Base64 JPEG)                │                 │
│              ▼                                       │                 │
│  ┌────────────────────────────────────────┐          │                 │
│  │   Interactive Review Form Modal        │          │                 │
│  │  - Auto-populated AI fields            │          │                 │
│  │  - Full inline editing                 │          │                 │
│  │  - Save / Retake actions               │          │                 │
│  └───────────────────┬────────────────────┘          │                 │
└──────────────────────┼───────────────────────────────┼─────────────────┘
                       │ POST /api/ai/analyze-item     │
                       │ POST /api/inventory           │
                       ▼                               │
┌──────────────────────────────────────────────────────┴─────────────────┐
│                        SERVER (EXPRESS.JS)                             │
│                                                                        │
│  ┌────────────────────────────────┐    ┌────────────────────────────┐  │
│  │  POST /api/ai/analyze-item     │    │  POST /api/inventory       │  │
│  │  - @google/genai SDK           │    │  - Drizzle ORM Upsert      │  │
│  │  - gemini-3.8-flash Vision     │    │  - Multi-tenant User Scape │  │
│  │  - Google Search Grounding     │    │                            │  │
│  └────────────────┬───────────────┘    └─────────────┬──────────────┘  │
└───────────────────┼──────────────────────────────────┼─────────────────┘
                    │                                  │
                    ▼                                  ▼
         ┌─────────────────────┐            ┌─────────────────────┐
         │ Gemini 3.8 Flash AI │            │ Cloud SQL (Postgres)│
         │ & Web Price Search  │            │ & Firebase Firestore│
         └─────────────────────┘            └─────────────────────┘
```

### Expanded Data Model (`InventoryItem`)

```typescript
export interface InventoryItem {
  id: string;
  serialNumber?: string;       // e.g. "1", "2", "SN-9428"
  code: string;               // e.g. "#HLT-1001", "#APP-2002"
  name: string;               // e.g. "Cutihance Men Tablets"
  subname?: string;           // e.g. "Nutraceutical supplement"
  category: string;           // "Health & Wellness" | "Home Appliances" | "Electronics" | etc.
  subCategory?: string;       // "Dietary Supplements / Hair & Skin Care"
  description?: string;       // Multi-line detailed product description
  brand?: string;             // e.g. "Cutihance", "Whirlpool"
  barcode?: string;           // Scanned barcode or "N/A"
  quantity?: string;          // e.g. "30 Tablets", "1 Unit"
  boxNumber?: string;         // e.g. "Box #3", "N/A"
  expiresDate?: string;       // Expiry date or "N/A"
  purchaseDate?: string;      // Purchase date or "N/A"
  value: number;              // Purchase price / valuation in ₹ INR
  condition?: string;         // "New / Unopened" | "Good" | "Used"
  notes?: string;             // Dermatologist advice, energy rating, etc.
  priceSource?: string;       // "Croma listed price", "MRP on label", etc.
  location?: string;          // "Master Bathroom", "Laundry Room"
  imageUrl: string;           // Snapshot data URL or stored URL
  createdAt?: string;
  updatedAt?: string;
}
```

### Database Schema Updates (`src/db/schema.ts`)
Add missing typed columns to `inventory_items`:
- `description`: `text('description')`
- `quantity`: `text('quantity')`
- `box_number`: `text('box_number')`
- `purchase_date`: `text('purchase_date')`
- `notes`: `text('notes')`
- `price_source`: `text('price_source')`
- `sub_category`: `text('sub_category')` (already present, ensured fully mapped)

### Interactive Review Form Specification
The modal will feature a 2-column or responsive vertical flow:
- Left / Top: Photo thumbnail with quick zoom and retake button.
- Right / Body: Structured field groups:
  1. **Primary Identification**: Product Name, Brand, Serial No., Barcode.
  2. **Categorization**: Category dropdown (Health & Wellness, Home Appliances, Electronics, Wardrobe, Furniture, Tools, etc.), Sub-category input.
  3. **Inventory & Storage**: Quantity, Box No, Storage Location, Condition.
  4. **Financial & Lifecycle**: Purchase Price (₹ INR), Price Estimate Source, Purchase Date, Expiry Date.
  5. **Specs & Notes**: Full Description textarea, Notes textarea.
- Live AI Extraction Progress: Shows a sleek scanning bar while Gemini processes, then populates all form fields automatically, highlighting newly detected attributes with option to edit before clicking **"Save to Vault"**.
