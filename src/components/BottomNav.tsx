import React from 'react';
import { ScreenType } from '../types/inventory';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 w-full z-50 bg-[#fbf8ff]/90 backdrop-blur-xl border-t border-[#e3e1ec]/80 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
      <div className="max-w-2xl mx-auto h-16 px-4 flex items-center justify-around">
        {/* Tab 1: Home */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 transition-colors ${
            currentScreen === 'dashboard'
              ? 'text-[#0051d5] font-semibold'
              : 'text-[#45474a] hover:text-[#1a1b22]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">space_dashboard</span>
          <span className="text-[11px] leading-none tracking-tight">Home</span>
        </button>

        {/* Tab 2: Inventory */}
        <button
          onClick={() => onNavigate('inventory')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 transition-colors ${
            currentScreen === 'inventory'
              ? 'text-[#0051d5] font-semibold'
              : 'text-[#45474a] hover:text-[#1a1b22]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">inventory_2</span>
          <span className="text-[11px] leading-none tracking-tight">Inventory</span>
        </button>

        {/* Tab 3: Elevated AI Camera Reticle Button */}
        <div className="flex items-center justify-center -mt-5">
          <button
            aria-label="Open AI Reticle Scanner"
            onClick={() => onNavigate('camera')}
            className={`flex items-center justify-center w-14 h-14 rounded-full bg-[#0051d5] text-white shadow-[0_4px_18px_rgba(0,81,213,0.38)] hover:bg-[#316bf3] active:scale-95 transition-all ${
              currentScreen === 'camera' ? 'ring-4 ring-[#0051d5]/25 scale-105' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[28px]">photo_camera</span>
          </button>
        </div>

        {/* Tab 4: Archive */}
        <button
          onClick={() => onNavigate('archive')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 transition-colors ${
            currentScreen === 'archive'
              ? 'text-[#0051d5] font-semibold'
              : 'text-[#45474a] hover:text-[#1a1b22]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">archive</span>
          <span className="text-[11px] leading-none tracking-tight">Archive</span>
        </button>

        {/* Tab 5: Vault ID */}
        <button
          onClick={() => onNavigate('vault_id')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 transition-colors ${
            currentScreen === 'vault_id'
              ? 'text-[#0051d5] font-semibold'
              : 'text-[#45474a] hover:text-[#1a1b22]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">tune</span>
          <span className="text-[11px] leading-none tracking-tight">Vault ID</span>
        </button>
      </div>
    </nav>
  );
};
