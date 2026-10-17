import React, { useState } from 'react';
import { ScreenType } from '../types/inventory';
import { useAuth } from '../context/AuthContext';

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
}) => {
  const { user } = useAuth();
  const [profileImgError, setProfileImgError] = useState(false);
  const isBackVisible = currentScreen === 'camera' || currentScreen === 'dossier';

  const defaultTitles: Record<ScreenType, { title: string; subtitle: string }> = {
    dashboard: { title: 'OmniVault', subtitle: 'DASHBOARD' },
    camera: { title: 'Ai Reticle Scanner', subtitle: 'ACTIVE RETICLE' },
    inventory: { title: 'OmniVault', subtitle: 'INVENTORY DATABASE' },
    archive: { title: 'OmniVault', subtitle: 'VAULT ARCHIVE' },
    dossier: { title: 'Asset Dossier Detail', subtitle: 'DIGITAL TWIN' },
    vault_id: { title: 'OmniVault', subtitle: 'VAULT ID & SECURITY' }
  };

  const displayTitle = title || defaultTitles[currentScreen]?.title || 'OmniVault';
  const displaySubtitle = subtitle || defaultTitles[currentScreen]?.subtitle || 'SYSTEM';

  return (
    <header className="fixed top-0 w-full z-50 bg-[#fbf8ff]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e3e1ec]/60">
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Synced Telemetry Pill */}
          <div className="flex items-center gap-1.5 bg-[#e8e7f1] px-2.5 py-1 rounded-full">
            <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-[#069669] animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-mono text-[11px] font-medium text-[#45474a] tracking-tight">
              {isSynced ? 'SYNCED' : 'UPDATING'}
            </span>
          </div>

          {/* Quick Search */}
          <button
            aria-label="Search items"
            onClick={onOpenSearch || (() => onNavigate('inventory'))}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-[#45474a] hover:text-[#1a1b22] hover:bg-[#eeedf7] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>

          {/* Phone Access QR Trigger */}
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

          {/* User Profile */}
          <button
            aria-label="User Profile & Vault ID"
            onClick={onOpenVaultId}
            className="flex items-center justify-center w-10 h-10 p-0.5 rounded-full hover:ring-2 hover:ring-[#0051d5]/30 transition-all focus:outline-none"
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
  );
};
