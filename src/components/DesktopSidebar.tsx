import React, { useState } from 'react';
import { CategoryOverview, ScreenType } from '../types/inventory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface DesktopSidebarProps {
  currentScreen: ScreenType;
  activeCategoryFilter: string | null;
  categories: CategoryOverview[];
  totalAssetCount: number;
  archiveCount: number;
  isSyncing: boolean;
  lastSyncedText: string;
  onNavigate: (screen: ScreenType) => void;
  onSelectCategoryFilter: (categoryName: string) => void;
  onSyncLedger: () => void;
  onOpenVaultId: () => void;
  onOpenPhoneModal: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentScreen,
  activeCategoryFilter,
  categories,
  totalAssetCount,
  archiveCount,
  isSyncing,
  lastSyncedText,
  onNavigate,
  onSelectCategoryFilter,
  onSyncLedger,
  onOpenVaultId,
  onOpenPhoneModal,
}) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [profileImgError, setProfileImgError] = useState(false);

  const navItems: {
    id: ScreenType;
    label: string;
    icon: string;
    count?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'space_dashboard',
    },
    {
      id: 'inventory',
      label: 'Inventory Ledger',
      icon: 'inventory_2',
      count: totalAssetCount,
    },
    {
      id: 'camera',
      label: 'AI Reticle Scanner',
      icon: 'document_scanner',
    },
    {
      id: 'archive',
      label: 'Vault Archive',
      icon: 'archive',
      count: archiveCount,
    },
    {
      id: 'vault_id',
      label: 'Vault ID & Security',
      icon: 'shield_lock',
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[264px] shrink-0 h-screen sticky top-0 bg-white border-r border-[#e3e1ec] select-none z-40">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#e3e1ec]">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 text-left group focus:outline-none min-w-0"
        >
          <img
            alt="OmniVault Logo"
            className="h-8 w-8 object-contain shrink-0"
            src="https://lh3.googleusercontent.com/aida/AEtjO1XSIZZWvXHrOIrUbfkW6MT-lO3GmY0wUc01d8ug_nwaAQE2A9MG9F9nC2cju57PAmd60O6u8yzyaqqCYey8EgUaI5grerFfnM8k7Vky7bZmAv5uL-HY3yiW3U23KoimuKNhV6tuIv3lgljtoXrolIkX8dCIy3gS-nFlyvt82H5j_PUQBDtKRQ46b8s5liL8CF9Nc6Fw6iDrzCHTxpFn0IY5qN5rdQX_gaydfC849irhjWrJmBZ-FvHTzfk"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[16px] text-[#1a1b22] tracking-tight leading-none truncate">
              OmniVault
            </span>
            <span className="font-mono text-[10px] text-[#45474a] tracking-wider mt-1 truncate">
              DESKTOP LEDGER
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-8 h-8 rounded-lg bg-[#f4f2fd] hover:bg-[#dbe1ff] text-[#1a1b22] flex items-center justify-center shrink-0 transition-colors border border-[#e3e1ec]"
        >
          <span className="material-symbols-outlined text-[17px] text-[#0051d5]">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      {/* Primary Action CTA */}
      <div className="p-4 border-b border-[#eeedf7]">
        <button
          type="button"
          onClick={() => onNavigate('camera')}
          className="w-full h-10 px-4 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          <span>Scan / Ingest Asset</span>
        </button>
      </div>

      {/* Scrollable Navigation & Category Rail */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6">
        {/* Primary Workspace Views */}
        <div className="flex flex-col gap-1">
          <div className="px-2.5 pb-1.5">
            <span className="font-mono text-[10px] font-semibold text-[#45474a] tracking-wider">
              WORKSPACE VIEWS
            </span>
          </div>
          {navItems.map((item) => {
            const isActive =
              currentScreen === item.id ||
              (item.id === 'inventory' && currentScreen === 'dossier');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'inventory') {
                    onSelectCategoryFilter('All');
                  }
                  onNavigate(item.id);
                }}
                className={`w-full h-10 px-3 rounded-xl flex items-center justify-between text-[13px] transition-colors ${
                  isActive
                    ? 'bg-[#f4f2fd] text-[#0051d5] font-semibold'
                    : 'text-[#45474a] hover:bg-[#f8f7fd] hover:text-[#1a1b22] font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`material-symbols-outlined text-[19px] shrink-0 ${
                      isActive ? 'text-[#0051d5]' : 'text-[#45474a]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </div>
                {typeof item.count === 'number' && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isActive ? 'text-[#0051d5] font-bold' : 'text-[#45474a]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Category Quick-Filter Matrix */}
        <div className="flex flex-col gap-1">
          <div className="px-2.5 pb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold text-[#45474a] tracking-wider">
              ASSET CATEGORIES
            </span>
            <span className="font-mono text-[10px] text-[#45474a] tabular-nums">
              {categories.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectCategoryFilter('All');
              onNavigate('inventory');
            }}
            className={`w-full h-9 px-3 rounded-xl flex items-center justify-between text-[12px] transition-colors ${
              currentScreen === 'inventory' &&
              (!activeCategoryFilter || activeCategoryFilter === 'All')
                ? 'bg-[#121417] text-white font-semibold'
                : 'text-[#45474a] hover:bg-[#f8f7fd] hover:text-[#1a1b22]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-[16px] shrink-0">apps</span>
              <span className="truncate whitespace-nowrap">All Categories</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums">{totalAssetCount}</span>
          </button>

          {categories.map((cat) => {
            const isSelected =
              currentScreen === 'inventory' && activeCategoryFilter === cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategoryFilter(cat.name);
                  onNavigate('inventory');
                }}
                className={`w-full h-9 px-3 rounded-xl flex items-center justify-between text-[12px] transition-colors ${
                  isSelected
                    ? 'bg-[#121417] text-white font-semibold'
                    : 'text-[#45474a] hover:bg-[#f8f7fd] hover:text-[#1a1b22]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`material-symbols-outlined text-[16px] shrink-0 ${
                      isSelected ? 'text-white' : 'text-[#0051d5]'
                    }`}
                  >
                    {cat.icon}
                  </span>
                  <span className="truncate whitespace-nowrap">{cat.name}</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums">{cat.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Sync & Account Footer */}
      <div className="p-3.5 border-t border-[#e3e1ec] bg-[#fbf8ff] flex flex-col gap-2.5">
        {/* Cloud Sync Bar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-[#e3e1ec] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`material-symbols-outlined text-[16px] text-[#0051d5] shrink-0 ${
                isSyncing ? 'animate-spin' : ''
              }`}
            >
              {isSyncing ? 'sync' : 'cloud_done'}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[#1a1b22] truncate">
                {isSyncing ? 'Syncing Vault...' : 'Cloud Synced'}
              </span>
              <span className="font-mono text-[10px] text-[#45474a] truncate">
                {lastSyncedText}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onSyncLedger}
            disabled={isSyncing}
            className="h-7 px-2.5 rounded-lg bg-[#f4f2fd] hover:bg-[#dbe1ff] text-[#0051d5] font-mono text-[10px] font-semibold shrink-0 transition-colors disabled:opacity-50"
          >
            Sync
          </button>
        </div>

        {/* User Profile & Mobile Companion Trigger */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={onOpenVaultId}
            className="flex items-center gap-2.5 min-w-0 flex-1 p-1.5 rounded-xl hover:bg-[#eeedf7]/70 transition-colors text-left"
          >
            {user?.photoURL && !profileImgError ? (
              <img
                alt={user.displayName || user.email || 'Profile'}
                className="w-8 h-8 rounded-full object-cover border border-[#c6c6ca] shrink-0"
                src={user.photoURL}
                referrerPolicy="no-referrer"
                onError={() => setProfileImgError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#0051d5] text-white flex items-center justify-center font-bold text-[12px] shrink-0">
                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold text-[#1a1b22] truncate">
                {user?.displayName || 'Vault Operator'}
              </span>
              <span className="font-mono text-[10px] text-[#45474a] truncate">
                {user?.email || 'Authenticated Session'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenPhoneModal}
            title="Pair or open on mobile phone"
            className="w-9 h-9 rounded-xl bg-[#eeedf7] hover:bg-[#dbe1ff] text-[#0051d5] flex items-center justify-center shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
