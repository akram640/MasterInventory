import { pgTable, serial, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table mapping Firebase UID to PostgreSQL
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Inventory table for assets stored in PostgreSQL
export const inventoryItems = pgTable('inventory_items', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  subname: text('subname'),
  category: text('category').notNull(),
  subCategory: text('sub_category'),
  status: text('status').notNull().default('Active'),
  statusLabel: text('status_label'),
  badgeType: text('badge_type'),
  value: doublePrecision('value').default(0),
  boughtDate: text('bought_date'),
  condition: text('condition'),
  location: text('location'),
  imageUrl: text('image_url').notNull(),
  imageAlt: text('image_alt'),
  serialNumber: text('serial_number'),
  description: text('description'),
  brand: text('brand'),
  barcode: text('barcode'),
  quantity: text('quantity'),
  boxNumber: text('box_number'),
  purchaseDate: text('purchase_date'),
  notes: text('notes'),
  priceSource: text('price_source'),
  expiresDate: text('expires_date'),
  dosage: text('dosage'),
  indication: text('indication'),
  carrier: text('carrier'),
  prescribedUses: text('prescribed_uses'),
  storageProtocol: text('storage_protocol'),
  copay: doublePrecision('copay'),
  assignedBin: text('assigned_bin'),
  linkedRxRef: text('linked_rx_ref'),
  batch: text('batch'),
  rfid: text('rfid'),
  firmware: text('firmware'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Vault Archive & Decommissioned Records
export const archiveItems = pgTable('archive_items', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  archivedReason: text('archived_reason'),
  archivedDate: text('archived_date'),
  statusBadge: text('status_badge'),
  statusBadgeText: text('status_badge_text'),
  purchaseValue: doublePrecision('purchase_value').default(0),
  purchaseDate: text('purchase_date'),
  secondaryLabel: text('secondary_label'),
  secondaryValue: text('secondary_value'),
  imageUrl: text('image_url').notNull(),
  imageAlt: text('image_alt'),
  historicalDetails: text('historical_details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  inventory: many(inventoryItems),
  archive: many(archiveItems),
}));

export const inventoryRelations = relations(inventoryItems, ({ one }) => ({
  user: one(users, {
    fields: [inventoryItems.userId],
    references: [users.uid],
  }),
}));

export const archiveRelations = relations(archiveItems, ({ one }) => ({
  user: one(users, {
    fields: [archiveItems.userId],
    references: [users.uid],
  }),
}));
