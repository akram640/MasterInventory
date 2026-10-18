# Uniform Unique Asset ID Generation & Ledger Unification

Establish a deterministic, collision-free **Asset ID** format (`CAT-YYMMDD-HASH`, e.g., `ELE-261017-8F2A`) across OmniVault, unify the separate `S.No` and secondary `#CODE` fields into a single canonical **Asset ID**, and automatically migrate all existing assets so every item in the ledger has a clean, unique identifier.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX decisions have been confirmed and will govern the implementation:

- **Confirmed Decision 1 — Uniform Asset ID Format**: Every asset will use the structured **Category + Date + Unique Hash** format (`CAT-YYMMDD-HASH`, such as `ELE-261017-8F2A`, `MED-261017-3C9D`, `HOM-261017-7A1B`), combining a 3-letter canonical category prefix, a 6-digit date stamp (`YYMMDD`), and a deterministic 4-character uppercase hexadecimal fingerprint.
- **Confirmed Decision 2 — Automatic Migration of Existing Assets**: All existing assets with duplicate numbers (such as multiple `1`s), raw batch strings (`MQ08BGB`), or legacy codes (`#HOM-9908`) will be automatically normalized to the new `CAT-YYMMDD-HASH` format and persisted back to PostgreSQL and cloud sync.
- **Confirmed Decision 3 — Unified Single Asset ID Display**: `S.No` and `code` will be unified into a single **Asset ID** column in the Inventory Ledger and across all cards, scanner review sheets, and Dossier views—eliminating redundant or conflicting secondary codes under the product brand.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces inconsistent `S.No` values (`1`, `1`, `14`, `MQ08BGB`) and separate `#CAT-1234` tags with a single deterministic, human-readable, and globally unique **Asset ID** (`CAT-YYMMDD-HASH`).
- **Target Audience / Persona**: Vault owners managing personal, household, medical, and electronics inventories across desktop and mobile who need reliable, scannable, and non-colliding asset identifiers.
- **Key Value**: Guarantees 100% uniqueness across every cataloged item, encodes both the asset's category and ingestion/purchase date directly in the ID, and removes visual clutter from the product & brand column.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Automatic Ledger Normalization on Load**: When the vault loads or syncs, any asset lacking a valid `CAT-YYMMDD-HASH` identifier (or sharing a duplicate ID) is deterministically upgraded and synced in the background.
  2. **Master Inventory Table & Grid Views**:
     - The `S.No` column is updated to **Asset ID** with sufficient width (`min-w-[135px]`) to display the full monospace identifier (`ELE-261017-8F2A`) on a single line without wrapping.
     - Under **Product & Brand**, the redundant `#CAT-1234` code next to the brand name is removed (displaying clean brand & sub-category metadata instead).
  3. **AI Reticle Scanner & Ingestion**:
     - When capturing a photo or changing the asset's category in the review modal, the assigned **Asset ID** updates dynamically to match the selected category, date, and unique asset seed.
     - If Gemini OCR detects a manufacturer batch/lot code on packaging (e.g., `MQ08BGB`), it is preserved in the dedicated barcode/batch metadata rather than overwriting the Vault Asset ID.
  4. **Live Dossier Inspector & Full Dossier Screen**:
     - Displays the unified **Asset ID** in the header and system ID bar with one-click copy to clipboard.
- **Visual Identity & Theme**:
  - *Typography & Hierarchy*: Enforces `JetBrains Mono` (`font-mono tabular-nums`) at `11px`–`12px` with crisp letter-spacing for all Asset IDs so category prefixes, date segments, and hex hashes align vertically down the table column.
  - *Color & Contrast*: Uses subtle high-contrast monospace badges in both Light and Dark mode (`text-[#0051d5]` / dark mode `text-[#60a5fa]` or high-contrast slate) with `whitespace-nowrap` discipline so IDs never break across lines.
- **Interactive Feedback & Motion**:
  - Clicking an Asset ID in the Dossier or Inspector copies the unified ID to the clipboard with instant toast confirmation.
  - Global search supports instant filtering by any part of the Asset ID (category prefix, date segment, or 4-char hash).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Deterministic FNV-1a Hash + Collision Guard Algorithm**
  - *Chosen Approach*: Generate the 4-character hex suffix (`HASH`) using a deterministic 32-bit FNV-1a hash seeded from the item's immutable primary key (`item.id`), product name, and index salt, combined with a Set-based collision guard across the active inventory list.
  - *Why*: Ensures that migrating an existing asset produces the exact same `CAT-YYMMDD-HASH` across both phone and MacBook without random drift during multi-device sync, while guaranteeing zero duplicates even if two identical products are scanned on the same day.
  - *Alternatives Considered*: Pure `Math.random()` generation (rejected because unsynced devices could generate different IDs for the same legacy item during migration).
- **Decision 2: Unified `code` and `serialNumber` Synchronization**
  - *Chosen Approach*: Store the canonical `CAT-YYMMDD-HASH` string in both `item.code` and `item.serialNumber` in the data model while displaying it once under the **Asset ID** column.
  - *Why*: Maintains full backward compatibility with existing PostgreSQL and Firestore schemas without requiring destructive database table drops.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   Asset ID Generation & Normalization Engine             │
│  ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────┐  │
│  │ Category Prefix    │ + │ Date Extractor     │ + │ FNV-1a 4-Hex     │  │
│  │ (ELE/MED/HOM/WAR…) │   │ (YYMMDD from Date) │   │ + Collision Set  │  │
│  └─────────┬──────────┘   └─────────┬──────────┘   └────────┬─────────┘  │
│            └────────────────────────┼───────────────────────┘            │
│                                     ▼                                    │
│                        Canonical ID: ELE-261017-8F2A                     │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│ Cloud & Local Sync    │   │ Camera / Manual Add   │   │ UI Presentation       │
│ - Auto-migrates       │   │ - Generates canonical │   │ - Table: Asset ID col │
│   legacy S.No / code  │   │   ID on scan/category │   │ - Brand row: clean    │
│ - Persists updates to │   │ - Keeps OCR lot codes │   │   without duplicate # │
│   Postgres & Firestore│   │   separate from ID    │   │ - Dossier & Inspector │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

- **Data Model & Algorithm Rules**:
  - **Category Prefix Map (`CAT`)**:
    - `Electronics & Gadgets` → `ELE`
    - `Medicine & Health` → `MED`
    - `Home & Appliances` → `HOM`
    - `Wardrobe & Apparel` → `WAR`
    - `Documents & Books` → `DOC`
    - `Kitchen & Pantry` → `KIT`
    - `Vehicles & Mobility` → `VEH`
    - `Valuables & Jewelry` → `VAL`
    - Fallback → First 3 uppercase letters of category or `AST`
  - **Date Segment (`YYMMDD`)**:
    - Parsed from `purchaseDate`, `boughtDate`, or the timestamp embedded in `item.id` (`real-item-<timestamp>`), falling back to the current date in `YYMMDD` format.
  - **Unique Hash (`HASH`)**:
    - 4-character uppercase hex (`0-9A-F`) derived deterministically from `item.id + item.name` with an automatic collision counter if another item in the vault shares the same prefix, date, and hash.
- **Interactive Component & State Mapping**:
  - **Sync & Migration Pipeline**: On inventory load/sync, checks if every item's `serialNumber` and `code` match `/^[A-Z]{3}-\d{6}-[0-9A-F]{4}$/` and are unique across the ledger. Any legacy or duplicate item is updated in state and persisted to PostgreSQL and Firestore.
  - **Inventory Ledger Table & Cards**: Displays `Asset ID` in a dedicated `whitespace-nowrap` monospace column (`ELE-261017-8F2A`), removes the duplicate `#CODE` next to the brand name, and supports sorting and searching by Asset ID.
  - **Scanner, Dossier, Inspector & Edit Modal**: All views read and edit the unified `Asset ID` consistently.
