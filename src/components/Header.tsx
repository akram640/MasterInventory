import React, { useState } from 'react';
import { ScreenType } from '../types/inventory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentScreen: ScreenType;
  title?: string;
  subtitle?: string;
  onNavigate: (screen: ScreenType) => void;
  onOpenVaultId: () => void;
  onOpenSearch?: () => void;
  onOpenPhoneModal?: () => void;
  onGoBack?: () => void;
  isSynced?: boolean;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  title,
  subtitle,
  onNavigate,
  onOpenVaultId,
  onOpenSearch,
  onOpenPhoneModal,
  onGoBack,
  isSynced = true,
  isInspectorOpen = true,
  onToggleInspector,
}) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [profileImgError, setProfileImgError] = useState(false);
  const isBackVisible = currentScreen === 'camera' || currentScreen === 'dossier';

  const defaultTitles: Record<ScreenType, { title: string; subtitle: string; breadcrumb: string }> = {
    dashboard: { title: 'OmniVault', subtitle: 'DASHBOARD', breadcrumb: 'Dashboard' },
    camera: { title: 'Ai Reticle Scanner', subtitle: 'ACTIVE RETICLE', breadcrumb: 'AI Optical Reticle Scanner' },
    inventory: { title: 'OmniVault', subtitle: 'INVENTORY DATABASE', breadcrumb: 'Master Inventory Ledger' },
    archive: { title: 'OmniVault', subtitle: 'VAULT ARCHIVE', breadcrumb: 'Vault Archive & Decommissioned' },
    dossier: { title: 'Asset Dossier Detail', subtitle: 'DIGITAL TWIN', breadcrumb: 'Asset Dossier Detail' },
    vault_id: { title: 'OmniVault', subtitle: 'VAULT ID & SECURITY', breadcrumb: 'Vault ID & Security Telemetry' },
  };

  const displayTitle = title || defaultTitles[currentScreen]?.title || 'OmniVault';
  const displaySubtitle = subtitle || defaultTitles[currentScreen]?.subtitle || 'SYSTEM';
  const desktopBreadcrumb = defaultTitles[currentScreen]?.breadcrumb || 'Dashboard';

  return (
    <>
      {/* Mobile & Compact Header (< 1024px) */}
      <header className="lg:hidden fixed top-0 w-full z-50 bg-[#fbf8ff]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e3e1ec]/60">
        <div className="max-w-2xl mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isBackVisible ? (
              <button
                aria-label="Go back"
                onClick={onGoBack || (() => onNavigate('dashboard'))}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-[#1a1b22] hover:bg-[#eeedf7] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
            ) : null}

            <div
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <img
                alt="OmniVault Logo"
                className="h-8 w-auto object-contain shrink-0"
                src="https://lh3.googleusercontent.com/aida/AEtjO1XSIZZWvXHrOIrUbfkW6MT-lO3GmY0wUc01d8ug_nwaAQE2A9MG9F9nC2cju57PAmd60O6u8yzyaqqCYey8EgUaI5grerFfnM8k7Vky7bZmAv5uL-HY3yiW3U23KoimuKNhV6tuIv3lgljtoXrolIkX8dCIy3gS-nFlyvt82H5j_PUQBDtKRQ46b8s5liL8CF9Nc6Fw6iDrzCHTxpFn0IY5qN5rdQX_gaydfC849irhjWrJmBZ-FvHTzfk"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-[16px] text-[#1a1b22] tracking-tight leading-none truncate">
                  {displayTitle}
                </span>
                <span className="font-mono text-[10px] text-[#45474a] uppercase tracking-wider mt-0.5 font-medium truncate">
                  {displaySubtitle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden xs:flex items-center gap-1.5 bg-[#e8e7f1] px-2.5 py-1 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-[#069669] animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-mono text-[11px] font-medium text-[#45474a] tracking-tight">
                {isSynced ? 'SYNCED' : 'UPDATING'}
              </span>
            </div>

            {/* Dark / Light Mode Toggle (Mobile) */}
            <button
              type="button"
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#f4f2fd] border border-[#e3e1ec] text-[#1a1b22] hover:bg-[#eeedf7] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[19px]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <button
              aria-label="Search items"
              onClick={onOpenSearch || (() => onNavigate('inventory'))}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-[#45474a] hover:text-[#1a1b22] hover:bg-[#eeedf7] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            {onOpenPhoneModal && (
              <button
                aria-label="Access on Phone"
                onClick={onOpenPhoneModal}
                title="Open app on mobile phone"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-[#0051d5] hover:bg-[#dbe1ff]/60 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">smartphone</span>
              </button>
            )}

            <button
              aria-label="User Profile & Vault ID"
              onClick={onOpenVaultId}
              className="flex items-center justify-center w-9 h-9 p-0.5 rounded-full hover:ring-2 hover:ring-[#0051d5]/30 transition-all focus:outline-none"
            >
              {user?.photoURL && !profileImgError ? (
                <img
                  alt={user.displayName || user.email || 'Profile'}
                  className="w-8 h-8 rounded-full object-cover border border-[#c6c6ca]"
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  onError={() => setProfileImgError(true)}
                />
              ) : user?.isDemoUser ? (
                <img
                  alt="Demo Profile"
                  className="w-8 h-8 rounded-full object-cover border border-[#c6c6ca]"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEtJS7KCWIxW4UuB6jUWTG_I9D3kfyBuZLC8HaQ-ftkTXShtGsc-Fyf8ZlITNejmMe40a3cbbgr9UkwlvDoptcpDLBUkSS9byNX3tEERhY2keVd3oPuMF6xgxDSVNPZ2M237vMzC7CzyzPuyL_qjQsuWd3s7CkV1NPI6APww98pGDjbrh0j4KbIgPX_HFS2hfiitrKalUw5-NRGGJ3SLxbHV352gi8c5LDIohkMjQ3kErRskwrwqX5"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#0051d5] text-white flex items-center justify-center font-bold text-[12px] border border-[#0051d5]/30 shadow-xs">
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Top Command Bar (>= 1024px) */}
      <header className="hidden lg:flex sticky top-0 z-40 h-16 px-8 bg-[#fbf8ff]/90 backdrop-blur-xl border-b border-[#e3e1ec] items-center justify-between gap-8 select-none">
        {/* Zone 1: Contextual Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          {isBackVisible && (
            <button
              type="button"
              onClick={onGoBack || (() => onNavigate('dashboard'))}
              className="w-8 h-8 rounded-lg hover:bg-[#eeedf7] text-[#1a1b22] flex items-center justify-center transition-colors"
              title="Go Back"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          )}
          <span
            onClick={() => onNavigate('dashboard')}
            className="text-[13px] font-medium text-[#45474a] hover:text-[#1a1b22] cursor-pointer whitespace-nowrap"
          >
            OmniVault
          </span>
          <span className="text-[#c6c6ca]">/</span>
          <span className="text-[14px] font-bold text-[#1a1b22] tracking-tight whitespace-nowrap">
            {desktopBreadcrumb}
          </span>
        </div>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="flex items-center gap-6 text-[13px] font-medium text-[#45474a]">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentScreen === 'dashboard'
                ? 'text-[#0051d5] font-semibold'
                : 'hover:text-[#1a1b22]'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentScreen === 'inventory'
                ? 'text-[#0051d5] font-semibold'
                : 'hover:text-[#1a1b22]'
            }`}
          >
            Inventory Ledger
          </button>
          <button
            type="button"
            onClick={() => onNavigate('camera')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentScreen === 'camera'
                ? 'text-[#0051d5] font-semibold'
                : 'hover:text-[#1a1b22]'
            }`}
          >
            AI Scanner
          </button>
          <button
            type="button"
            onClick={() => onNavigate('archive')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentScreen === 'archive'
                ? 'text-[#0051d5] font-semibold'
                : 'hover:text-[#1a1b22]'
            }`}
          >
            Archive
          </button>
        </nav>

        {/* Zone 3: Theme Toggle, Inspector Toggle & Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Dark / Light Mode Toggle (Desktop Command Bar) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="h-9 px-3 rounded-xl bg-white hover:bg-[#f4f2fd] border border-[#e3e1ec] text-[#1a1b22] font-medium text-[12px] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[17px] text-[#0051d5]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {(currentScreen === 'dashboard' || currentScreen === 'inventory') && onToggleInspector && (
            <button
              type="button"
              onClick={onToggleInspector}
              className={`h-9 px-3 rounded-xl font-medium text-[12px] flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
                isInspectorOpen
                  ? 'bg-[#f4f2fd] border-[#0051d5]/30 text-[#0051d5]'
                  : 'bg-white border-[#e3e1ec] text-[#45474a] hover:text-[#1a1b22]'
              }`}
              title="Toggle Right Dossier Inspector Panel"
            >
              <span className="material-symbols-outlined text-[17px]">dock_to_left</span>
              <span>{isInspectorOpen ? 'Hide Inspector' : 'Show Inspector'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('camera')}
            className="h-9 px-4 rounded-xl bg-[#121417] hover:bg-[#2f3038] text-white font-semibold text-[12px] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">document_scanner</span>
            <span>Quick Scan</span>
          </button>
        </div>
      </header>
    </>
  );
};


