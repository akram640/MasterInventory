import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScreenType, InventoryItem, ArchiveItem, CategoryOverview } from './types/inventory';
import {
  INITIAL_INVENTORY_ITEMS,
  INITIAL_RECENT_SCANS,
  INITIAL_ARCHIVE_ITEMS,
  DEFAULT_DOSSIER_DATA,
} from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { DesktopInspectorDrawer } from './components/DesktopInspectorDrawer';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { CameraScreen } from './components/screens/CameraScreen';
import { InventoryScreen } from './components/screens/InventoryScreen';
import { DossierScreen } from './components/screens/DossierScreen';
import { ArchiveScreen } from './components/screens/ArchiveScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { VaultIdModal } from './components/modals/VaultIdModal';
import { PhoneAccessModal } from './components/modals/PhoneAccessModal';
import {
  FullScreenImageViewerModal,
  InspectableAssetImage,
} from './components/modals/FullScreenImageViewerModal';
import { auth, db, handleFirestoreError, OperationType, testFirestoreConnection } from './lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import {
  syncUserWithPostgres,
  fetchPostgresInventory,
  savePostgresInventoryItem,
  savePostgresAssetImage,
  deletePostgresInventoryItem,
  fetchPostgresArchive,
  savePostgresArchiveItem,
  deletePostgresArchiveItem,
  purgeAllPostgresArchive,
} from './lib/api';
import { computeUnifiedCategories, doesItemMatchCategory } from './utils/categoryTaxonomy';
import { generateUniqueAssetId, normalizeInventoryAssetIds } from './utils/assetId';

function sanitizeItemForStorage(item: InventoryItem, userId?: string): Record<string, unknown> {
  const apiImg = `/api/images/${encodeURIComponent(item.id)}`;
  const lightweightImageUrl =
    item.imageUrl && item.imageUrl.startsWith('data:') ? apiImg : item.imageUrl || apiImg;

  const raw: Record<string, unknown> = {
    ...item,
    imageUrl: lightweightImageUrl,
    highResImageUrl: apiImg,
  };
  if (userId) {
    raw.userId = userId;
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

function safeCacheWrite(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage quota warning, clearing old cache:', err);
  }
}

function computeInventorySignature(items: InventoryItem[]): string {
  return items
    .map(
      (i) =>
        `${i.id}:${i.code || ''}:${i.serialNumber || ''}:${i.quantity || ''}:${i.value || 0}:${i.name}:${i.category}:${i.subCategory || ''}:${i.status}:${i.purchaseDate || ''}:${i.manufacturingDate || ''}:${i.expiresDate || ''}:${i.boughtDate || ''}:${i.location || ''}:${i.geoLocation || ''}:${i.condition || ''}:${i.brand || ''}:${i.barcode || ''}:${i.boxNumber || ''}:${i.notes || ''}:${i.description || ''}:${i.imageUrl || ''}`
    )
    .join('|');
}

function MainApp() {
  const { user, isLoggedIn, isLoading } = useAuth();

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['dashboard']);

  // Master Data State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recentScans, setRecentScans] = useState<InventoryItem[]>([]);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [selectedDossierItem, setSelectedDossierItem] = useState<InventoryItem>(DEFAULT_DOSSIER_DATA);

  // Filters & Sub-state
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedText, setLastSyncedText] = useState('just now');
  const [isVaultIdModalOpen, setIsVaultIdModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [inspectedImageItem, setInspectedImageItem] = useState<InspectableAssetImage | null>(null);
  const [isDesktopInspectorOpen, setIsDesktopInspectorOpen] = useState(false);

  const inventorySignatureRef = useRef<string>('');
  const isSyncInFlightRef = useRef<boolean>(false);

  // Load User Data based on whether it's Demo or Real User
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Persist real user changes to LocalStorage safely (lightweight URLs only)
  const saveUserInventory = useCallback(
    async (items: InventoryItem[]) => {
      const { items: idNormalized } = normalizeInventoryAssetIds(items);
      const normalized = idNormalized.map(
        (it) => sanitizeItemForStorage(it) as unknown as InventoryItem
      );
      inventorySignatureRef.current = computeInventorySignature(normalized);
      setInventoryItems(normalized);
      setRecentScans(normalized.slice(0, 5));
      if (user && !user.isDemoUser) {
        safeCacheWrite(`omnivault_items_${user.uid}`, normalized);
      }
    },
    [user]
  );

  const saveUserArchive = useCallback(
    async (items: ArchiveItem[]) => {
      setArchiveItems(items);
      if (user && !user.isDemoUser) {
        safeCacheWrite(`omnivault_arch_${user.uid}`, items);
      }
    },
    [user]
  );

  // Unified bidirectional cloud sync (PostgreSQL + Firestore)
  const syncVaultWithCloud = useCallback(
    async (options?: { showSpinner?: boolean; forceRefreshCache?: boolean }) => {
      if (!user || user.isDemoUser) {
        if (options?.showSpinner) {
          setIsSyncing(true);
          setTimeout(() => {
            setIsSyncing(false);
            setLastSyncedText('just now');
          }, 500);
        }
        return;
      }

      if (isSyncInFlightRef.current && !options?.showSpinner) return;
      isSyncInFlightRef.current = true;
      if (options?.showSpinner) setIsSyncing(true);

      const userCacheKey = `omnivault_items_${user.uid}`;
      const userArchKey = `omnivault_arch_${user.uid}`;

      if (options?.forceRefreshCache) {
        try {
          localStorage.removeItem(userCacheKey);
          localStorage.removeItem(userArchKey);
          inventorySignatureRef.current = '';
        } catch {
          // ignore
        }
      }

      try {
        // Ensure Firebase Auth state has settled before checking auth.currentUser
        try {
          if (typeof auth.authStateReady === 'function') {
            await Promise.race([
              auth.authStateReady(),
              new Promise((resolve) => setTimeout(resolve, 1000)),
            ]);
          }
        } catch {
          // ignore
        }

        await syncUserWithPostgres(user);

        const [pgItems, pgArch] = await Promise.all([
          fetchPostgresInventory(),
          fetchPostgresArchive(),
        ]);

        if (pgItems && pgItems.length > 0) {
          const sanitizedPg = pgItems.map(
            (it) => sanitizeItemForStorage(it) as unknown as InventoryItem
          );
          const { items: normalizedPg, mutatedItems } = normalizeInventoryAssetIds(sanitizedPg);
          const nextSig = computeInventorySignature(normalizedPg);

          if (nextSig !== inventorySignatureRef.current || options?.showSpinner) {
            inventorySignatureRef.current = nextSig;
            setInventoryItems(normalizedPg);
            setRecentScans(normalizedPg.slice(0, 5));
            safeCacheWrite(userCacheKey, normalizedPg);
            setSelectedDossierItem((prev) => {
              const match = normalizedPg.find((i) => i.id === prev?.id);
              return match || normalizedPg[0];
            });
          }

          // Persist any automatically migrated Asset IDs back to PostgreSQL
          if (mutatedItems.length > 0) {
            for (const migratedItem of mutatedItems) {
              savePostgresInventoryItem(migratedItem).catch(() => {});
            }
          }

          // Full reconciliation with Firestore so both Preview and Published clients stay identical
          if (auth.currentUser) {
            try {
              const targetUid = auth.currentUser.uid;
              const invRef = collection(db, 'users', targetUid, 'inventory');
              const snap = await getDocs(invRef);
              const firestoreMap = new Map<string, InventoryItem>();
              snap.docs.forEach((d) => {
                const data = d.data() as InventoryItem;
                const docId = data?.id || d.id;
                if (docId) firestoreMap.set(docId, data);
              });

              const pgIdSet = new Set(normalizedPg.map((i) => i.id));

              // 1. Delete any stale Firestore documents that were archived or deleted in PostgreSQL
              for (const [fsDocId] of firestoreMap.entries()) {
                if (!pgIdSet.has(fsDocId)) {
                  deleteDoc(doc(db, 'users', targetUid, 'inventory', fsDocId)).catch(() => {});
                }
              }

              // 2. Push any PostgreSQL items missing or outdated in Firestore
              for (const pgItem of normalizedPg) {
                const fsItem = firestoreMap.get(pgItem.id);
                if (
                  !fsItem ||
                  fsItem.code !== pgItem.code ||
                  fsItem.serialNumber !== pgItem.serialNumber ||
                  fsItem.quantity !== pgItem.quantity ||
                  fsItem.value !== pgItem.value ||
                  fsItem.name !== pgItem.name ||
                  fsItem.category !== pgItem.category ||
                  fsItem.subCategory !== pgItem.subCategory ||
                  fsItem.purchaseDate !== pgItem.purchaseDate ||
                  fsItem.manufacturingDate !== pgItem.manufacturingDate ||
                  fsItem.expiresDate !== pgItem.expiresDate ||
                  fsItem.boughtDate !== pgItem.boughtDate ||
                  fsItem.location !== pgItem.location ||
                  fsItem.geoLocation !== pgItem.geoLocation ||
                  fsItem.condition !== pgItem.condition ||
                  fsItem.status !== pgItem.status ||
                  fsItem.brand !== pgItem.brand ||
                  fsItem.barcode !== pgItem.barcode ||
                  fsItem.boxNumber !== pgItem.boxNumber ||
                  fsItem.notes !== pgItem.notes ||
                  fsItem.imageUrl?.startsWith('data:')
                ) {
                  const itemDoc = doc(db, 'users', targetUid, 'inventory', pgItem.id);
                  setDoc(itemDoc, sanitizeItemForStorage(pgItem, targetUid)).catch(() => {});
                }
              }
            } catch {
              // ignore background Firestore reconciliation errors
            }
          }
        } else if (auth.currentUser) {
          // Fallback to Firestore if PostgreSQL returned empty
          const targetUid = auth.currentUser.uid;
          const invRef = collection(db, 'users', targetUid, 'inventory');
          const snap = await getDocs(invRef);
          if (!snap.empty) {
            const rawRemote = snap.docs.map(
              (d) => sanitizeItemForStorage(d.data() as InventoryItem) as unknown as InventoryItem
            );
            const { items: remoteItems } = normalizeInventoryAssetIds(rawRemote);
            inventorySignatureRef.current = computeInventorySignature(remoteItems);
            setInventoryItems(remoteItems);
            setRecentScans(remoteItems.slice(0, 5));
            safeCacheWrite(userCacheKey, remoteItems);
            setSelectedDossierItem(remoteItems[0]);
            for (const it of remoteItems) {
              savePostgresInventoryItem(it);
            }
          }
        }

        if (pgArch) {
          setArchiveItems(pgArch);
          safeCacheWrite(userArchKey, pgArch);
        }

        setLastSyncedText('just now');
      } catch (err) {
        console.warn('Cloud sync error:', err);
      } finally {
        isSyncInFlightRef.current = false;
        if (options?.showSpinner) {
          setIsSyncing(false);
        }
      }
    },
    [user]
  );

  // Initial load + Real-time Firestore listener + Fast Cross-Device Polling & Focus Sync
  useEffect(() => {
    if (!user) {
      setInventoryItems([]);
      setRecentScans([]);
      setArchiveItems([]);
      inventorySignatureRef.current = '';
      return;
    }

    if (user.isDemoUser) {
      setInventoryItems(INITIAL_INVENTORY_ITEMS);
      setRecentScans(INITIAL_RECENT_SCANS);
      setArchiveItems(INITIAL_ARCHIVE_ITEMS);
      setSelectedDossierItem(DEFAULT_DOSSIER_DATA);
      return;
    }

    const userCacheKey = `omnivault_items_${user.uid}`;
    const userArchKey = `omnivault_arch_${user.uid}`;

    try {
      const cached = localStorage.getItem(userCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as InventoryItem[];
        const { items: normalizedCached } = normalizeInventoryAssetIds(parsed);
        inventorySignatureRef.current = computeInventorySignature(normalizedCached);
        setInventoryItems(normalizedCached);
        setRecentScans(normalizedCached.slice(0, 5));
        if (normalizedCached.length > 0) setSelectedDossierItem(normalizedCached[0]);
      }
      const cachedArch = localStorage.getItem(userArchKey);
      if (cachedArch) {
        setArchiveItems(JSON.parse(cachedArch));
      }
    } catch {
      // ignore corrupt cache
    }

    // 1. Immediate sync with PostgreSQL & Firestore
    syncVaultWithCloud({ showSpinner: true });

    // 2. Real-time Firestore onSnapshot listener for instant cross-device push updates
    let unsubscribeFirestore: (() => void) | null = null;
    if (auth.currentUser) {
      const targetUid = auth.currentUser.uid;
      const invRef = collection(db, 'users', targetUid, 'inventory');
      unsubscribeFirestore = onSnapshot(
        invRef,
        () => {
          // Trigger fast PostgreSQL sync whenever another device writes to Firestore
          syncVaultWithCloud({ showSpinner: false });
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${targetUid}/inventory`);
        }
      );
    }

    // 3. Fast background poll (every 4s while tab is visible) + immediate sync on tab focus/visibility
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncVaultWithCloud({ showSpinner: false });
      }
    }, 4000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncVaultWithCloud({ showSpinner: false });
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [user, syncVaultWithCloud]);

  // Dynamic system alerts calculated from real user data
  const realSystemAlerts = useMemo(() => {
    const alerts = [];
    // Expiring within 30 days
    const expiring = inventoryItems.filter((i) => i.status === 'Warning' || (i.expiresDate && i.expiresDate.includes('2024')));
    if (expiring.length > 0) {
      alerts.push({
        id: 'real-alert-exp',
        title: expiring.map((i) => i.name).slice(0, 2).join(' • '),
        badgeText: '< 30 Days',
        badgeType: 'amber' as const,
        subtitle: `Expiring soon: ${expiring[0].location || 'Review needed'}`,
        icon: 'medication',
        category: expiring[0].category,
      });
    }
    return alerts;
  }, [inventoryItems]);

  // Categories computed directly from real items (unified across Home and Inventory screens)
  const dynamicCategories: CategoryOverview[] = useMemo(() => {
    return computeUnifiedCategories(inventoryItems);
  }, [inventoryItems]);

  // Navigation handlers
  const navigateTo = useCallback((screen: ScreenType) => {
    setCurrentScreen((prevScreen) => {
      if (prevScreen !== screen) {
        setIsDesktopInspectorOpen(false);
      }
      return screen;
    });
    setScreenHistory((prev) => [...prev, screen]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    setIsDesktopInspectorOpen(false);
    if (screenHistory.length > 1) {
      const nextHistory = [...screenHistory];
      nextHistory.pop();
      const prevScreen = nextHistory[nextHistory.length - 1];
      setScreenHistory(nextHistory);
      setCurrentScreen(prevScreen || 'dashboard');
    } else {
      setCurrentScreen('dashboard');
      setScreenHistory(['dashboard']);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [screenHistory]);

  // Real Live Cloud Sync when user clicks SYNC
  const handleSyncLedger = useCallback(() => {
    syncVaultWithCloud({ showSpinner: true, forceRefreshCache: true });
  }, [syncVaultWithCloud]);

  // When an item is ingested via AI Reticle Scanner
  const handleItemIngested = useCallback(
    async (newItem: InventoryItem) => {
      const highResPayload = newItem.highResImageUrl;
      const rawImagePayload = newItem.imageUrl;
      const apiImagePath = `/api/images/${encodeURIComponent(newItem.id)}`;

      const itemForList: InventoryItem = {
        ...newItem,
        imageUrl: rawImagePayload?.startsWith('data:') ? apiImagePath : rawImagePayload,
        highResImageUrl: apiImagePath,
      };

      // Optimistically show captured image until PostgreSQL finishes saving
      const optimisticItem: InventoryItem = {
        ...newItem,
        highResImageUrl: highResPayload || rawImagePayload,
      };

      const updated = [optimisticItem, ...inventoryItems];
      saveUserInventory(updated);
      setSelectedDossierItem(optimisticItem);

      // Save to PostgreSQL (inventory_items + asset_images) and Firestore
      if (user && !user.isDemoUser) {
        if (highResPayload && highResPayload.startsWith('data:')) {
          await savePostgresAssetImage(newItem.id, { imageData: highResPayload });
        } else if (rawImagePayload && rawImagePayload.startsWith('data:')) {
          await savePostgresAssetImage(newItem.id, { imageData: rawImagePayload });
        }
        await savePostgresInventoryItem(newItem);

        if (auth.currentUser) {
          try {
            const targetUid = auth.currentUser.uid;
            const itemDoc = doc(db, 'users', targetUid, 'inventory', newItem.id);
            await setDoc(itemDoc, sanitizeItemForStorage(itemForList, targetUid));
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/inventory/${newItem.id}`);
          }
        }
      }
    },
    [inventoryItems, saveUserInventory, user]
  );

  // When Dossier is updated
  const handleSaveDossier = useCallback(
    async (updatedItem: InventoryItem) => {
      setSelectedDossierItem(updatedItem);
      const idx = inventoryItems.findIndex((i) => i.id === updatedItem.id);
      let updated: InventoryItem[];
      if (idx !== -1) {
        updated = [...inventoryItems];
        updated[idx] = updatedItem;
      } else {
        updated = [updatedItem, ...inventoryItems];
      }
      saveUserInventory(updated);

      if (user && !user.isDemoUser) {
        await savePostgresInventoryItem(updatedItem);
        if (auth.currentUser) {
          try {
            const targetUid = auth.currentUser.uid;
            const itemDoc = doc(db, 'users', targetUid, 'inventory', updatedItem.id);
            await setDoc(itemDoc, sanitizeItemForStorage(updatedItem, targetUid));
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/inventory/${updatedItem.id}`);
          }
        }
      }
    },
    [inventoryItems, saveUserInventory, user]
  );

  // Batch Archive from Inventory
  const handleArchiveItems = useCallback(
    async (itemIds: string[]) => {
      const itemsToArchive = inventoryItems.filter((i) => itemIds.includes(i.id));
      if (itemsToArchive.length === 0) return;

      const newArchivedRecords: ArchiveItem[] = itemsToArchive.map((item) => ({
        id: `arch-${Date.now()}-${item.id}`,
        code: item.code,
        name: item.name,
        category: item.category,
        archivedReason: 'Moved from Inventory database to Vault archive',
        archivedDate: 'Today',
        statusBadge: 'Discarded',
        statusBadgeText: 'Archived',
        purchaseValue: item.value || 0,
        purchaseDate: item.boughtDate || 'Recent',
        secondaryLabel: 'ASSIGNED LOCATION',
        secondaryValue: item.location || 'Decommissioned Vault',
        imageUrl: item.imageUrl,
        imageAlt: item.imageAlt || item.name,
      }));

      const nextInv = inventoryItems.filter((i) => !itemIds.includes(i.id));
      const nextArch = [...newArchivedRecords, ...archiveItems];

      saveUserInventory(nextInv);
      saveUserArchive(nextArch);

      if (user && !user.isDemoUser) {
        for (const record of newArchivedRecords) {
          savePostgresArchiveItem(record);
        }
        for (const id of itemIds) {
          deletePostgresInventoryItem(id);
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'inventory', id));
          } catch {
            // ignore
          }
        }
      }
    },
    [inventoryItems, archiveItems, saveUserInventory, saveUserArchive, user]
  );

  // Duplicate an item
  const handleDuplicateItem = useCallback(
    (item: InventoryItem) => {
      const dupId = `item-${Date.now()}`;
      const usedSet = new Set(inventoryItems.map((i) => i.code));
      const newAssetId = generateUniqueAssetId(
        {
          id: dupId,
          name: `${item.name} (Copy)`,
          category: item.category,
          subCategory: item.subCategory,
          purchaseDate: item.purchaseDate,
          boughtDate: item.boughtDate,
        },
        usedSet
      );
      const duplicate: InventoryItem = {
        ...item,
        id: dupId,
        code: newAssetId,
        serialNumber: newAssetId,
        name: `${item.name} (Copy)`,
      };
      saveUserInventory([duplicate, ...inventoryItems]);
      if (user && !user.isDemoUser) {
        savePostgresInventoryItem(duplicate);
      }
    },
    [inventoryItems, saveUserInventory, user]
  );

  // Restore an archived item back to active inventory
  const handleRestoreArchiveItem = useCallback(
    (archItem: ArchiveItem) => {
      const restoredId = `item-restored-${Date.now()}`;
      const usedSet = new Set(inventoryItems.map((i) => i.code));
      const restoredAssetId = generateUniqueAssetId(
        {
          id: restoredId,
          name: archItem.name,
          category: archItem.category,
          purchaseDate: archItem.purchaseDate,
        },
        usedSet
      );
      const restoredItem: InventoryItem = {
        id: restoredId,
        code: restoredAssetId,
        serialNumber: restoredAssetId,
        name: archItem.name,
        subname: `${archItem.category} > Restored record`,
        category: archItem.category,
        status: 'Active',
        statusLabel: 'Restored',
        badgeType: 'emerald',
        value: archItem.purchaseValue,
        boughtDate: archItem.purchaseDate,
        imageUrl: archItem.imageUrl,
        imageAlt: archItem.imageAlt,
        location: 'Restored Staging Area',
      };

      const nextArch = archiveItems.filter((i) => i.id !== archItem.id);
      const nextInv = [restoredItem, ...inventoryItems];

      saveUserArchive(nextArch);
      saveUserInventory(nextInv);

      if (user && !user.isDemoUser) {
        deletePostgresArchiveItem(archItem.id);
        savePostgresInventoryItem(restoredItem);
      }
    },
    [archiveItems, inventoryItems, saveUserArchive, saveUserInventory, user]
  );

  // Purge item from archive
  const handlePurgeArchiveItem = useCallback(
    (itemId: string) => {
      const nextArch = archiveItems.filter((i) => i.id !== itemId);
      saveUserArchive(nextArch);
      if (user && !user.isDemoUser) {
        deletePostgresArchiveItem(itemId);
      }
    },
    [archiveItems, saveUserArchive, user]
  );

  // Empty entire archive
  const handlePurgeAllArchive = useCallback(() => {
    saveUserArchive([]);
    if (user && !user.isDemoUser) {
      purgeAllPostgresArchive();
    }
  }, [saveUserArchive, user]);

  const relevantScreenItems = useMemo(() => {
    if (currentScreen === 'dashboard') {
      return recentScans.length > 0 ? recentScans : inventoryItems;
    }
    if (currentScreen === 'inventory') {
      if (activeCategoryFilter && activeCategoryFilter !== 'All') {
        return inventoryItems.filter((item) =>
          doesItemMatchCategory(item, activeCategoryFilter)
        );
      }
      return inventoryItems;
    }
    return inventoryItems;
  }, [currentScreen, recentScans, inventoryItems, activeCategoryFilter]);

  const activeInspectorItem =
    currentScreen === 'dossier'
      ? inventoryItems.find((i) => i.id === selectedDossierItem?.id) ||
        selectedDossierItem ||
        inventoryItems[0]
      : relevantScreenItems.find((i) => i.id === selectedDossierItem?.id) ||
        relevantScreenItems[0] ||
        null;

  const showDesktopInspector =
    isDesktopInspectorOpen &&
    (currentScreen === 'dashboard' || currentScreen === 'inventory') &&
    relevantScreenItems.length > 0 &&
    Boolean(activeInspectorItem);

  const handleCategoryFilterSelect = useCallback(
    (cat: string) => {
      setActiveCategoryFilter(cat);
      if (cat && cat !== 'All') {
        const matchingItems = inventoryItems.filter((item) =>
          doesItemMatchCategory(item, cat)
        );
        if (matchingItems.length === 0) {
          setIsDesktopInspectorOpen(false);
        } else if (
          !selectedDossierItem ||
          !doesItemMatchCategory(selectedDossierItem, cat)
        ) {
          setSelectedDossierItem(matchingItems[0]);
        }
      }
    },
    [inventoryItems, selectedDossierItem]
  );

  // If user is not logged in, show the Login Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbf8ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#0051d5] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[12px] text-[#45474a]">Decrypting Vault Ledger...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen onOpenPhoneModal={() => setIsPhoneModalOpen(true)} />
        {isPhoneModalOpen && (
          <PhoneAccessModal onClose={() => setIsPhoneModalOpen(false)} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8ff] text-[#1a1b22] flex flex-col lg:flex-row font-sans selection:bg-[#dbe1ff]">
      {/* Desktop Left Sidebar Navigation (>= 1024px) */}
      <DesktopSidebar
        currentScreen={currentScreen}
        activeCategoryFilter={activeCategoryFilter}
        categories={dynamicCategories}
        totalAssetCount={inventoryItems.length}
        archiveCount={archiveItems.length}
        isSyncing={isSyncing}
        lastSyncedText={lastSyncedText}
        onNavigate={navigateTo}
        onSelectCategoryFilter={handleCategoryFilterSelect}
        onSyncLedger={handleSyncLedger}
        onOpenVaultId={() => setIsVaultIdModalOpen(true)}
        onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
      />

      {/* Right Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Universal Top Header (Mobile Fixed Bar + Desktop Sticky Command Bar) */}
        <Header
          currentScreen={currentScreen}
          onNavigate={navigateTo}
          onOpenVaultId={() => setIsVaultIdModalOpen(true)}
          onOpenSearch={() => navigateTo('inventory')}
          onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
          onGoBack={goBack}
          isSynced={!isSyncing}
          isInspectorOpen={showDesktopInspector}
          onToggleInspector={() => {
            if (!showDesktopInspector && relevantScreenItems.length > 0 && !activeInspectorItem) {
              setSelectedDossierItem(relevantScreenItems[0]);
            }
            setIsDesktopInspectorOpen((prev) => !prev);
          }}
        />

        {/* Master-Detail Workspace Area */}
        <div className="flex-1 w-full flex items-start min-w-0">
          {/* Primary Screen Viewport */}
          <main className="flex-1 min-w-0 flex flex-col">
            {currentScreen === 'dashboard' && (
              <DashboardScreen
                inventoryItems={inventoryItems}
                recentScans={recentScans}
                systemAlerts={
                  user?.isDemoUser
                    ? [
                        {
                          id: 'alert-1',
                          title: 'Amoxicillin • Ibuprofen',
                          badgeText: '< 30 Days',
                          badgeType: 'amber',
                          subtitle: 'Cabinet A-3 • Expiring 14 Oct & 22 Oct 2024',
                          icon: 'medication',
                          category: 'Medicine',
                        },
                        {
                          id: 'alert-2',
                          title: 'MacBook Pro 16" M2 Max',
                          badgeText: 'Warranty Alert',
                          badgeType: 'amber',
                          subtitle: 'AppleCare+ tier expires in 12 days • Renewal pending',
                          icon: 'verified_user',
                          category: 'Electronics',
                        },
                      ]
                    : realSystemAlerts
                }
                categories={dynamicCategories}
                selectedDossierId={showDesktopInspector ? activeInspectorItem?.id : undefined}
                onNavigate={navigateTo}
                onSelectCategoryFilter={(cat) => {
                  handleCategoryFilterSelect(cat);
                  navigateTo('inventory');
                }}
                onSelectDossierItem={(item) => {
                  setSelectedDossierItem(item);
                  setIsDesktopInspectorOpen(true);
                }}
                onSyncLedger={handleSyncLedger}
                isSyncing={isSyncing}
                lastSyncedText={lastSyncedText}
                isRealUser={!user?.isDemoUser}
                onInspectImage={(item) => setInspectedImageItem(item)}
              />
            )}

            {currentScreen === 'camera' && (
              <CameraScreen
                onNavigate={navigateTo}
                onItemIngested={handleItemIngested}
                onUpdateExistingItem={handleSaveDossier}
                existingItems={inventoryItems}
                existingCount={inventoryItems.length}
                onOpenDossier={(item) => {
                  if (item) setSelectedDossierItem(item);
                  navigateTo('dossier');
                }}
                onInspectImage={(item) => setInspectedImageItem(item)}
              />
            )}

            {currentScreen === 'inventory' && (
              <InventoryScreen
                items={inventoryItems}
                selectedDossierId={showDesktopInspector ? activeInspectorItem?.id : undefined}
                initialCategoryFilter={activeCategoryFilter}
                onCategoryChange={handleCategoryFilterSelect}
                onSelectDossierItem={(item) => {
                  setSelectedDossierItem(item);
                  setIsDesktopInspectorOpen(true);
                }}
                onNavigate={navigateTo}
                onArchiveItems={handleArchiveItems}
                onDuplicateItem={handleDuplicateItem}
                onInspectImage={(item) => setInspectedImageItem(item)}
              />
            )}

            {currentScreen === 'dossier' && activeInspectorItem && (
              <DossierScreen
                item={activeInspectorItem}
                onNavigate={navigateTo}
                onSaveDossier={handleSaveDossier}
                onInspectImage={(item) => setInspectedImageItem(item)}
              />
            )}

            {currentScreen === 'archive' && (
              <ArchiveScreen
                archiveItems={archiveItems}
                onRestoreItem={handleRestoreArchiveItem}
                onPurgeItem={handlePurgeArchiveItem}
                onPurgeAll={handlePurgeAllArchive}
                onNavigate={navigateTo}
                onInspectImage={(item) => setInspectedImageItem(item)}
              />
            )}

            {currentScreen === 'vault_id' && (
              <div className="flex flex-col w-full max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 pt-24 lg:pt-8 pb-28 lg:pb-12 gap-4">
                <VaultIdModal
                  onClose={() => navigateTo('dashboard')}
                  onSync={handleSyncLedger}
                  isSyncing={isSyncing}
                  onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
                />
              </div>
            )}
          </main>

          {/* Desktop Right Master-Detail Dossier Inspector Drawer (>= 1024px) */}
          {showDesktopInspector && activeInspectorItem && (
            <DesktopInspectorDrawer
              item={activeInspectorItem}
              isOpen={showDesktopInspector}
              onClose={() => setIsDesktopInspectorOpen(false)}
              onSaveDossier={handleSaveDossier}
              onNavigate={navigateTo}
              onInspectImage={(item) => setInspectedImageItem(item)}
              onArchiveItem={(itemId) => handleArchiveItems([itemId])}
              onDuplicateItem={handleDuplicateItem}
            />
          )}
        </div>
      </div>

      {/* Vault ID & Telemetry Modal */}
      {isVaultIdModalOpen && (
        <VaultIdModal
          onClose={() => setIsVaultIdModalOpen(false)}
          onSync={handleSyncLedger}
          isSyncing={isSyncing}
          onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
        />
      )}

      {/* Phone Access QR Modal */}
      {isPhoneModalOpen && (
        <PhoneAccessModal onClose={() => setIsPhoneModalOpen(false)} />
      )}

      {/* Full-Screen Asset Image Lightbox Viewer */}
      {inspectedImageItem && (
        <FullScreenImageViewerModal
          item={inspectedImageItem}
          onClose={() => setInspectedImageItem(null)}
        />
      )}

      {/* Universal Bottom Navigation (Mobile < 1024px) */}
      <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
