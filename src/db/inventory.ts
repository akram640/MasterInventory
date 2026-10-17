import { db } from './index.ts';
import { inventoryItems, archiveItems } from './schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { InventoryItem, ArchiveItem } from '../types/inventory.ts';

export async function getUserInventory(userId: string): Promise<InventoryItem[]> {
  try {
    const rows = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.userId, userId))
      .orderBy(desc(inventoryItems.createdAt));

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      subname: r.subname || '',
      category: r.category as InventoryItem['category'],
      subCategory: r.subCategory || undefined,
      status: (r.status as InventoryItem['status']) || 'Active',
      statusLabel: r.statusLabel || undefined,
      badgeType: (r.badgeType as InventoryItem['badgeType']) || undefined,
      value: r.value ?? 0,
      boughtDate: r.boughtDate || '',
      purchaseDate: r.purchaseDate || undefined,
      condition: r.condition || undefined,
      location: r.location || undefined,
      imageUrl: r.imageUrl,
      imageAlt: r.imageAlt || r.name,
      serialNumber: r.serialNumber || undefined,
      description: r.description || undefined,
      brand: r.brand || undefined,
      barcode: r.barcode || undefined,
      quantity: r.quantity || undefined,
      boxNumber: r.boxNumber || undefined,
      expiresDate: r.expiresDate || undefined,
      notes: r.notes || undefined,
      priceSource: r.priceSource || undefined,
      dosage: r.dosage || undefined,
      indication: r.indication || undefined,
      carrier: r.carrier || undefined,
      prescribedUses: r.prescribedUses || undefined,
      storageProtocol: r.storageProtocol || undefined,
      copay: r.copay || undefined,
      assignedBin: r.assignedBin || undefined,
      linkedRxRef: r.linkedRxRef || undefined,
      batch: r.batch || undefined,
      rfid: r.rfid || undefined,
      firmware: r.firmware || undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch user inventory:', error);
    throw new Error('Database query failed.', { cause: error });
  }
}

export async function upsertInventoryItem(userId: string, item: InventoryItem) {
  try {
    const record = {
      id: item.id,
      userId,
      code: item.code,
      name: item.name,
      subname: item.subname || null,
      category: item.category,
      subCategory: item.subCategory || null,
      status: item.status || 'Active',
      statusLabel: item.statusLabel || null,
      badgeType: item.badgeType || null,
      value: item.value ?? 0,
      boughtDate: item.boughtDate || null,
      purchaseDate: item.purchaseDate || null,
      condition: item.condition || null,
      location: item.location || null,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt || item.name,
      serialNumber: item.serialNumber || null,
      description: item.description || null,
      brand: item.brand || null,
      barcode: item.barcode || null,
      quantity: item.quantity || null,
      boxNumber: item.boxNumber || null,
      expiresDate: item.expiresDate || null,
      notes: item.notes || null,
      priceSource: item.priceSource || null,
      dosage: item.dosage || null,
      indication: item.indication || null,
      carrier: item.carrier || null,
      prescribedUses: item.prescribedUses || null,
      storageProtocol: item.storageProtocol || null,
      copay: item.copay ?? null,
      assignedBin: item.assignedBin || null,
      linkedRxRef: item.linkedRxRef || null,
      batch: item.batch || null,
      rfid: item.rfid || null,
      firmware: item.firmware || null,
      updatedAt: new Date(),
    };

    await db
      .insert(inventoryItems)
      .values(record)
      .onConflictDoUpdate({
        target: inventoryItems.id,
        set: record,
      });

    return item;
  } catch (error) {
    console.error('Failed to upsert inventory item:', error);
    throw new Error('Database save failed.', { cause: error });
  }
}

export async function deleteInventoryItem(userId: string, itemId: string) {
  try {
    await db
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, itemId)));
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    throw new Error('Database delete failed.', { cause: error });
  }
}

export async function getUserArchive(userId: string): Promise<ArchiveItem[]> {
  try {
    const rows = await db
      .select()
      .from(archiveItems)
      .where(eq(archiveItems.userId, userId))
      .orderBy(desc(archiveItems.createdAt));

    return rows.map((r) => {
      let histDetails = undefined;
      if (r.historicalDetails) {
        try {
          histDetails = JSON.parse(r.historicalDetails);
        } catch {
          // ignore
        }
      }

      return {
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category as ArchiveItem['category'],
        archivedReason: r.archivedReason || '',
        archivedDate: r.archivedDate || '',
        statusBadge: (r.statusBadge as ArchiveItem['statusBadge']) || 'Discarded',
        statusBadgeText: r.statusBadgeText || 'Archived',
        purchaseValue: r.purchaseValue ?? 0,
        purchaseDate: r.purchaseDate || '',
        secondaryLabel: r.secondaryLabel || 'ARCHIVE RECORD',
        secondaryValue: r.secondaryValue || '',
        imageUrl: r.imageUrl,
        imageAlt: r.imageAlt || r.name,
        historicalDetails: histDetails,
      };
    });
  } catch (error) {
    console.error('Failed to fetch user archive:', error);
    throw new Error('Database query failed.', { cause: error });
  }
}

export async function upsertArchiveItem(userId: string, item: ArchiveItem) {
  try {
    const record = {
      id: item.id,
      userId,
      code: item.code,
      name: item.name,
      category: item.category,
      archivedReason: item.archivedReason || null,
      archivedDate: item.archivedDate || null,
      statusBadge: item.statusBadge || 'Discarded',
      statusBadgeText: item.statusBadgeText || 'Archived',
      purchaseValue: item.purchaseValue ?? 0,
      purchaseDate: item.purchaseDate || null,
      secondaryLabel: item.secondaryLabel || null,
      secondaryValue: item.secondaryValue || null,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt || item.name,
      historicalDetails: item.historicalDetails ? JSON.stringify(item.historicalDetails) : null,
    };

    await db
      .insert(archiveItems)
      .values(record)
      .onConflictDoUpdate({
        target: archiveItems.id,
        set: record,
      });

    return item;
  } catch (error) {
    console.error('Failed to save archive item:', error);
    throw new Error('Database save failed.', { cause: error });
  }
}

export async function deleteArchiveItem(userId: string, itemId: string) {
  try {
    await db
      .delete(archiveItems)
      .where(and(eq(archiveItems.userId, userId), eq(archiveItems.id, itemId)));
  } catch (error) {
    console.error('Failed to delete archive item:', error);
    throw new Error('Database delete failed.', { cause: error });
  }
}

export async function purgeAllUserArchive(userId: string) {
  try {
    await db
      .delete(archiveItems)
      .where(eq(archiveItems.userId, userId));
  } catch (error) {
    console.error('Failed to purge archive:', error);
    throw new Error('Database purge failed.', { cause: error });
  }
}
