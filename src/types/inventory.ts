export type ScreenType = 'dashboard' | 'camera' | 'inventory' | 'archive' | 'dossier' | 'vault_id';

export type InventoryCategory =
  | 'Health & Wellness'
  | 'Home Appliances'
  | 'Electronics'
  | 'Medicine'
  | 'Apparel'
  | 'Furniture'
  | 'Vehicles'
  | 'Documents'
  | string;

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  subname: string;
  category: InventoryCategory;
  subCategory?: string;
  status: 'Active' | 'Warning' | 'Insured' | 'Stored' | 'Archived' | string;
  statusLabel?: string;
  badgeType?: 'warning' | 'emerald' | 'blue' | 'neutral';
  value: number; // Purchase price / valuation in ₹ INR
  boughtDate: string;
  purchaseDate?: string;
  condition?: string;
  location?: string;
  imageUrl: string;
  imageAlt: string;
  // Granular identification & physical attributes
  serialNumber?: string;
  description?: string;
  brand?: string;
  barcode?: string;
  quantity?: string;
  boxNumber?: string;
  expiresDate?: string;
  notes?: string;
  priceSource?: string;
  // Specific domain attributes
  dosage?: string;
  indication?: string;
  carrier?: string;
  prescribedUses?: string;
  storageProtocol?: string;
  copay?: number;
  assignedBin?: string;
  linkedRxRef?: string;
  batch?: string;
  rfid?: string;
  firmware?: string;
}

export interface ArchiveItem {
  id: string;
  code: string;
  name: string;
  category: InventoryCategory;
  archivedReason: string;
  archivedDate: string;
  statusBadge: 'Expired' | 'Sold' | 'Donated' | 'Discarded';
  statusBadgeText: string;
  purchaseValue: number;
  purchaseDate: string;
  secondaryLabel: string;
  secondaryValue: string;
  imageUrl: string;
  imageAlt: string;
  historicalDetails?: {
    originalMsrp: string;
    carrierLock?: string;
    batteryHealth?: string;
    depreciation?: string;
    transactionRef?: string;
  };
}

export interface SystemAlert {
  id: string;
  title: string;
  badgeText: string;
  badgeType: 'amber' | 'secondary' | 'error';
  subtitle: string;
  icon: string;
  category: string;
}

export interface CategoryOverview {
  id: string;
  name: string;
  count: number;
  flaggedText: string;
  icon: string;
}
