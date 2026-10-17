import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface VaultIdModalProps {
  onClose: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenPhoneModal?: () => void;
}

export const VaultIdModal: React.FC<VaultIdModalProps> = ({
  onClose,
  onSync,
  isSyncing,
  onOpenPhoneModal,
}) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-4 border border-[#e3e1ec] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#eeedf7]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0051d5] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-semibold text-[15px] text-[#1a1b22]">OmniVault ID &amp; Telemetry</h3>
              <span className="font-mono text-[10px] text-[#45474a]">
                {user?.isDemoUser ? 'MODE: DEMO PREVIEW' : 'MODE: REAL USER VAULT'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#eeedf7] flex items-center justify-center text-[#45474a] hover:text-[#1a1b22]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 bg-[#f4f2fd] p-3 rounded-xl border border-[#e3e1ec]/50">
          {user?.photoURL ? (
            <img
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              src={user.photoURL}
              referrerPolicy="no-referrer"
            />
          ) : user?.isDemoUser ? (
            <img
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEtJS7KCWIxW4UuB6jUWTG_I9D3kfyBuZLC8HaQ-ftkTXShtGsc-Fyf8ZlITNejmMe40a3cbbgr9UkwlvDoptcpDLBUkSS9byNX3tEERhY2keVd3oPuMF6xgxDSVNPZ2M237vMzC7CzyzPuyL_qjQsuWd3s7CkV1NPI6APww98pGDjbrh0j4KbIgPX_HFS2hfiitrKalUw5-NRGGJ3SLxbHV352gi8c5LDIohkMjQ3kErRskwrwqX5"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#0051d5] text-white flex items-center justify-center font-bold text-[18px] border-2 border-white shadow-sm">
              {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-[14px] text-[#1a1b22] truncate">
              {user?.email || 'akramfaiz84@gmail.com'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[10px] bg-white px-1.5 py-0.2 rounded text-[#0051d5] font-bold border border-[#c6c6ca]/40">
                #{user?.uid ? user.uid.slice(0, 8).toUpperCase() : 'OV-99824'}
              </span>
              <span className="text-[11px] text-[#069669] font-medium flex items-center gap-0.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#069669] animate-pulse" />{' '}
                {user?.isDemoUser ? 'Demo Mode' : 'Clean Vault Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Matrix */}
        <div className="flex flex-col gap-2 font-mono text-[11px]">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f4f2fd]/60 border border-[#e3e1ec]/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#0051d5]">lock</span>
              <span className="text-[#45474a]">Encryption Cipher</span>
            </div>
            <span className="font-semibold text-[#1a1b22]">AES-256 GCM</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f4f2fd]/60 border border-[#e3e1ec]/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#069669]">database</span>
              <span className="text-[#45474a]">Cloud Database</span>
            </div>
            <span className="text-[#069669] font-bold">Cloud SQL (PostgreSQL)</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f4f2fd]/60 border border-[#e3e1ec]/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#0051d5]">schema</span>
              <span className="text-[#45474a]">ORM &amp; Migrations</span>
            </div>
            <span className="text-[#1a1b22] font-semibold">Drizzle ORM Engine</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          {onOpenPhoneModal && (
            <button
              onClick={() => {
                onClose();
                onOpenPhoneModal();
              }}
              className="w-full h-11 bg-[#f4f2fd] hover:bg-[#eeedf7] text-[#0051d5] rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 border border-[#0051d5]/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">smartphone</span>
              Access on Your Phone (QR Code)
            </button>
          )}

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="w-full h-11 bg-[#0051d5] hover:bg-[#316bf3] text-white rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            {isSyncing ? 'Synchronizing Cryptographic Shards...' : 'Force Cryptographic Re-Sync'}
          </button>

          <button
            onClick={handleLogout}
            className="w-full h-10 bg-[#ffdad6] hover:bg-[#ffdad6]/80 text-[#93000a] rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[17px]">logout</span>
            <span>Sign Out of Vault</span>
          </button>
        </div>
      </div>
    </div>
  );
};
