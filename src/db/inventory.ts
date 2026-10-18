import { db } from './index.ts';
import { inventoryItems, archiveItems, assetImages } from './schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { InventoryItem, ArchiveItem } from '../types/inventory.ts';

export interface AssetImageRecord {
  itemId: string;
  userId: string;
  mimeType: string;
  imageData: string;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  isHighRes: boolean;
}

export async function upsertAssetImage(
  userId: string,
  payload: {
    itemId: string;
    imageData: string;
    mimeType?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
  }
) {
  try {
    let mimeType = payload.mimeType || 'image/jpeg';
    if (payload.imageData.startsWith('data:')) {
      const match = payload.imageData.match(/^data:([^;]+);base64,/);
      if (match) mimeType = match[1];
    }
    const sizeBytes =
      payload.sizeBytes ??
      Math.round((payload.imageData.length * 3) / 4);

    const record = {
      itemId: payload.itemId,
      userId,
      mimeType,
      imageData: payload.imageData,
      width: payload.width ?? null,
      height: payload.height ?? null,
      sizeBytes,
      updatedAt: new Date(),
    };

    await db
      .insert(assetImages)
      .values(record)
      .onConflictDoUpdate({
        target: assetImages.itemId,
        set: record,
      });

    return true;
  } catch (error) {
    console.error('Failed to upsert asset image:', error);
    return false;
  }
}

export async function getAssetImage(itemId: string): Promise<AssetImageRecord | null> {
  try {
    const rows = await db
      .select()
      .from(assetImages)
      .where(eq(assetImages.itemId, itemId))
      .limit(1);

    if (rows.length > 0) {
      const r = rows[0];
      return {
        itemId: r.itemId,
        userId: r.userId,
        mimeType: r.mimeType || 'image/jpeg',
        imageData: r.imageData,
        width: r.width,
        height: r.height,
        sizeBytes: r.sizeBytes,
        isHighRes: true,
      };
    }

    // Fallback to inventory_items thumbnail if no dedicated high-res record exists yet
    const invRows = await db
      .select({
        id: inventoryItems.id,
        userId: inventoryItems.userId,
        imageUrl: inventoryItems.imageUrl,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId))
      .limit(1);

    if (
      invRows.length > 0 &&
      invRows[0].imageUrl &&
      !invRows[0].imageUrl.startsWith('/api/images/')
    ) {
      const img = invRows[0].imageUrl;
      let mimeType = 'image/jpeg';
      if (img.startsWith('data:')) {
        const match = img.match(/^data:([^;]+);base64,/);
        if (match) mimeType = match[1];
      }
      return {
        itemId: invRows[0].id,
        userId: invRows[0].userId,
        mimeType,
        imageData: img,
        width: null,
        height: null,
        sizeBytes: img.startsWith('data:') ? Math.round((img.length * 3) / 4) : null,
        isHighRes: false,
      };
    }

    // Fallback to archive_items thumbnail
    const archRows = await db
      .select({
        id: archiveItems.id,
        userId: archiveItems.userId,
        imageUrl: archiveItems.imageUrl,
      })
      .from(archiveItems)
      .where(eq(archiveItems.id, itemId))
      .limit(1);

    if (
      archRows.length > 0 &&
      archRows[0].imageUrl &&
      !archRows[0].imageUrl.startsWith('/api/images/')
    ) {
      const img = archRows[0].imageUrl;
      return {
        itemId: archRows[0].id,
        userId: archRows[0].userId,
        mimeType: 'image/jpeg',
        imageData: img,
        width: null,
        height: null,
        sizeBytes: img.startsWith('data:') ? Math.round((img.length * 3) / 4) : null,
        isHighRes: false,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch asset image:', error);
    return null;
  }
}

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
      manufacturingDate: r.manufacturingDate || undefined,
      condition: r.condition || undefined,
      location: r.location || undefined,
      geoLocation: r.geoLocation || undefined,
      imageUrl: r.imageUrl?.startsWith('data:')
        ? `/api/images/${encodeURIComponent(r.id)}`
        : r.imageUrl,
      imageAlt: r.imageAlt || r.name,
      highResImageUrl: `/api/images/${encodeURIComponent(r.id)}`,
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
    const apiImagePath = `/api/images/${encodeURIComponent(item.id)}`;
    const hasInlineDataImage = Boolean(item.imageUrl && item.imageUrl.startsWith('data:'));
    const hasInlineHighRes = Boolean(
      item.highResImageUrl && item.highResImageUrl.startsWith('data:')
    );

    // Persist inline base64 image into dedicated asset_images table first
    if (hasInlineHighRes && item.highResImageUrl) {
      await upsertAssetImage(userId, {
        itemId: item.id,
        imageData: item.highResImageUrl,
      });
    } else if (hasInlineDataImage && item.imageUrl) {
      const existingImg = await db
        .select({ itemId: assetImages.itemId })
        .from(assetImages)
        .where(eq(assetImages.itemId, item.id))
        .limit(1);
      if (existingImg.length === 0) {
        await upsertAssetImage(userId, {
          itemId: item.id,
          imageData: item.imageUrl,
        });
      }
    }

    const storedImageUrl = hasInlineDataImage ? apiImagePath : item.imageUrl || apiImagePath;

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
      manufacturingDate: item.manufacturingDate || null,
      condition: item.condition || null,
      location: item.location || null,
      geoLocation: item.geoLocation || null,
      imageUrl: storedImageUrl,
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

    return {
      ...item,
      imageUrl: storedImageUrl,
      highResImageUrl: apiImagePath,
    };
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
    await db
      .delete(assetImages)
      .where(and(eq(assetImages.userId, userId), eq(assetImages.itemId, itemId)));
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

