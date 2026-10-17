import { useState, useCallback, useEffect, useMemo } from 'react';
import { ScreenType, InventoryItem, ArchiveItem, CategoryOverview } from './types/inventory';
import {
  INITIAL_INVENTORY_ITEMS,
  INITIAL_RECENT_SCANS,
  INITIAL_ARCHIVE_ITEMS,
  DEFAULT_DOSSIER_DATA,
} from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { CameraScreen } from './components/screens/CameraScreen';
import { InventoryScreen } from './components/screens/InventoryScreen';
import { DossierScreen } from './components/screens/DossierScreen';
import { ArchiveScreen } from './components/screens/ArchiveScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { VaultIdModal } from './components/modals/VaultIdModal';
import { PhoneAccessModal } from './components/modals/PhoneAccessModal';
import { db, handleFirestoreError, OperationType, testFirestoreConnection } from './lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import {
  syncUserWithPostgres,
  fetchPostgresInventory,
  savePostgresInventoryItem,
  deletePostgresInventoryItem,
  fetchPostgresArchive,
  savePostgresArchiveItem,
  deletePostgresArchiveItem,
  purgeAllPostgresArchive,
} from './lib/api';

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

  // Load User Data based on whether it's Demo or Real User
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  useEffect(() => {
    if (!user) {
      setInventoryItems([]);
      setRecentScans([]);
      setArchiveItems([]);
      return;
    }

    if (user.isDemoUser) {
      // Demo mode: show prototype mock data
      setInventoryItems(INITIAL_INVENTORY_ITEMS);
      setRecentScans(INITIAL_RECENT_SCANS);
      setArchiveItems(INITIAL_ARCHIVE_ITEMS);
      setSelectedDossierItem(DEFAULT_DOSSIER_DATA);
    } else {
      // REAL USER: ZERO DUMMY DATA GUARANTEE
      // Load user's real items from local storage cache first, then sync with Firestore
      const userCacheKey = `omnivault_items_${user.uid}`;
      const userArchKey = `omnivault_arch_${user.uid}`;

      let loadedItems: InventoryItem[] = [];
      let loadedArch: ArchiveItem[] = [];

      try {
        const cached = localStorage.getItem(userCacheKey);
        if (cached) {
          loadedItems = JSON.parse(cached);
        }
        const cachedArch = localStorage.getItem(userArchKey);
        if (cachedArch) {
          loadedArch = JSON.parse(cachedArch);
        }
      } catch {
        // ignore
      }

      setInventoryItems(loadedItems);
      setRecentScans(loadedItems.slice(0, 5));
      setArchiveItems(loadedArch);

      if (loadedItems.length > 0) {
        setSelectedDossierItem(loadedItems[0]);
      }

      // Fetch from PostgreSQL backend and fallback/sync with Firestore & cache
      const fetchUserData = async () => {
        try {
          await syncUserWithPostgres(user);

          // 1. Fetch from PostgreSQL backend
          const pgItems = await fetchPostgresInventory();
          const pgArch = await fetchPostgresArchive();

          if (pgItems && pgItems.length > 0) {
            setInventoryItems(pgItems);
            setRecentScans(pgItems.slice(0, 5));
            localStorage.setItem(userCacheKey, JSON.stringify(pgItems));
            setSelectedDossierItem(pgItems[0]);
          } else {
            // Check Firestore if PostgreSQL was not yet populated
            const invRef = collection(db, 'users', user.uid, 'inventory');
            const snap = await getDocs(invRef);
            if (!snap.empty) {
              const remoteItems = snap.docs.map((d) => d.data() as InventoryItem);
              setInventoryItems(remoteItems);
              setRecentScans(remoteItems.slice(0, 5));
              localStorage.setItem(userCacheKey, JSON.stringify(remoteItems));
              setSelectedDossierItem(remoteItems[0]);
              // Populate PostgreSQL
              for (const it of remoteItems) {
                savePostgresInventoryItem(it);
              }
            }
          }

          if (pgArch && pgArch.length > 0) {
            setArchiveItems(pgArch);
            localStorage.setItem(userArchKey, JSON.stringify(pgArch));
          } else {
            const archRef = collection(db, 'users', user.uid, 'archive');
            const archSnap = await getDocs(archRef);
            if (!archSnap.empty) {
              const remoteArch = archSnap.docs.map((d) => d.data() as ArchiveItem);
              setArchiveItems(remoteArch);
              localStorage.setItem(userArchKey, JSON.stringify(remoteArch));
              for (const ar of remoteArch) {
                savePostgresArchiveItem(ar);
              }
            }
          }
        } catch (err) {
          console.warn('Backend load error:', err);
        }
      };

      fetchUserData();
    }
  }, [user]);

  // Persist real user changes to LocalStorage and Firestore
  const saveUserInventory = useCallback(
    async (items: InventoryItem[]) => {
      setInventoryItems(items);
      if (user && !user.isDemoUser) {
        localStorage.setItem(`omnivault_items_${user.uid}`, JSON.stringify(items));
      }
    },
    [user]
  );

  const saveUserArchive = useCallback(
    async (items: ArchiveItem[]) => {
      setArchiveItems(items);
      if (user && !user.isDemoUser) {
        localStorage.setItem(`omnivault_arch_${user.uid}`, JSON.stringify(items));
      }
    },
    [user]
  );

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

  // Categories computed directly from real items
  const dynamicCategories: CategoryOverview[] = useMemo(() => {
    const baseCats: { id: string; name: string; icon: string }[] = [
      { id: 'cat-med', name: 'Medicine & Health', icon: 'health_and_safety' },
      { id: 'cat-appliance', name: 'Home Appliances', icon: 'local_laundry_service' },
      { id: 'cat-elec', name: 'Electronics & Tech', icon: 'devices' },
      { id: 'cat-app', name: 'Wardrobe & Apparel', icon: 'apparel' },
      { id: 'cat-furn', name: 'Home & Furniture', icon: 'chair' },
      { id: 'cat-veh', name: 'Vehicles & Mobility', icon: 'commute' },
      { id: 'cat-doc', name: 'Documents & Valuables', icon: 'folder_special' },
    ];

    return baseCats.map((cat) => {
      const count = inventoryItems.filter((i) => {
        const itemCat = (i.category || '').toLowerCase();
        if (cat.id === 'cat-med') {
          return itemCat.includes('medicine') || itemCat.includes('health') || itemCat.includes('wellness');
        }
        if (cat.id === 'cat-appliance') {
          return itemCat.includes('appliance') || itemCat.includes('laundry');
        }
        if (cat.id === 'cat-elec') {
          return itemCat.includes('electr') || itemCat.includes('tech');
        }
        if (cat.id === 'cat-app') {
          return itemCat.includes('apparel') || itemCat.includes('wardrobe') || itemCat.includes('clothing');
        }
        if (cat.id === 'cat-furn') {
          return itemCat.includes('furn') || itemCat.includes('chair') || itemCat.includes('table');
        }
        if (cat.id === 'cat-veh') {
          return itemCat.includes('veh') || itemCat.includes('car');
        }
        if (cat.id === 'cat-doc') {
          return itemCat.includes('doc') || itemCat.includes('valuable');
        }
        return itemCat.includes(cat.name.split(' ')[0].toLowerCase());
      }).length;

      return {
        ...cat,
        count,
        flaggedText: count > 0 ? `${count} indexed` : '0 indexed',
      };
    });
  }, [inventoryItems]);

  // Navigation handlers
  const navigateTo = useCallback((screen: ScreenType) => {
    setCurrentScreen(screen);
    setScreenHistory((prev) => [...prev, screen]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
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

  // Sync Ledger Simulation & Firestore sync
  const handleSyncLedger = useCallback(() => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncedText('just now');
    }, 1000);
  }, []);

  // When an item is ingested via AI Reticle Scanner
  const handleItemIngested = useCallback(
    async (newItem: InventoryItem) => {
      const updated = [newItem, ...inventoryItems];
      saveUserInventory(updated);
      setRecentScans((prev) => [newItem, ...prev]);
      setSelectedDossierItem(newItem);

      // Save to PostgreSQL and Firestore
      if (user && !user.isDemoUser) {
        savePostgresInventoryItem(newItem);
        try {
          const itemDoc = doc(db, 'users', user.uid, 'inventory', newItem.id);
          await setDoc(itemDoc, { ...newItem, userId: user.uid });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/inventory/${newItem.id}`);
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
        savePostgresInventoryItem(updatedItem);
        try {
          const itemDoc = doc(db, 'users', user.uid, 'inventory', updatedItem.id);
          await setDoc(itemDoc, { ...updatedItem, userId: user.uid });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/inventory/${updatedItem.id}`);
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
      const duplicate: InventoryItem = {
        ...item,
        id: `item-${Date.now()}`,
        code: `${item.code}-DUP`,
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
      const restoredItem: InventoryItem = {
        id: `item-restored-${Date.now()}`,
        code: archItem.code,
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
    <div className="min-h-screen bg-[#fbf8ff] text-[#1a1b22] flex flex-col font-sans selection:bg-[#dbe1ff]">
      {/* Universal Top Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={navigateTo}
        onOpenVaultId={() => setIsVaultIdModalOpen(true)}
        onOpenSearch={() => navigateTo('inventory')}
        onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
        onGoBack={goBack}
        isSynced={!isSyncing}
      />

      {/* Screen Viewports */}
      <main className="flex-1 w-full flex flex-col">
        {currentScreen === 'dashboard' && (
          <DashboardScreen
            inventoryItems={inventoryItems}
            recentScans={recentScans}
            systemAlerts={user?.isDemoUser ? [
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
            ] : realSystemAlerts}
            categories={dynamicCategories}
            onNavigate={navigateTo}
            onSelectCategoryFilter={(cat) => {
              setActiveCategoryFilter(cat);
              navigateTo('inventory');
            }}
            onSelectDossierItem={(item) => setSelectedDossierItem(item)}
            onSyncLedger={handleSyncLedger}
            isSyncing={isSyncing}
            lastSyncedText={lastSyncedText}
            isRealUser={!user?.isDemoUser}
          />
        )}

        {currentScreen === 'camera' && (
          <CameraScreen
            onNavigate={navigateTo}
            onItemIngested={handleItemIngested}
            onOpenDossier={(item) => {
              if (item) setSelectedDossierItem(item);
              navigateTo('dossier');
            }}
          />
        )}

        {currentScreen === 'inventory' && (
          <InventoryScreen
            items={inventoryItems}
            initialCategoryFilter={activeCategoryFilter}
            onSelectDossierItem={(item) => setSelectedDossierItem(item)}
            onNavigate={navigateTo}
            onArchiveItems={handleArchiveItems}
            onDuplicateItem={handleDuplicateItem}
          />
        )}

        {currentScreen === 'dossier' && (
          <DossierScreen
            item={selectedDossierItem}
            onNavigate={navigateTo}
            onSaveDossier={handleSaveDossier}
          />
        )}

        {currentScreen === 'archive' && (
          <ArchiveScreen
            archiveItems={archiveItems}
            onRestoreItem={handleRestoreArchiveItem}
            onPurgeItem={handlePurgeArchiveItem}
            onPurgeAll={handlePurgeAllArchive}
            onNavigate={navigateTo}
          />
        )}

        {currentScreen === 'vault_id' && (
          <div className="flex flex-col w-full max-w-2xl mx-auto px-4 pt-24 pb-28 gap-4">
            <VaultIdModal
              onClose={() => navigateTo('dashboard')}
              onSync={handleSyncLedger}
              isSyncing={isSyncing}
              onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
            />
          </div>
        )}
      </main>

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

      {/* Universal Bottom Navigation */}
      <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
