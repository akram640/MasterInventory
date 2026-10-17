import React from 'react';
import { ArchiveItem } from '../../types/inventory';

interface HistoricalDossierModalProps {
  item: ArchiveItem;
  onClose: () => void;
}

export const HistoricalDossierModal: React.FC<HistoricalDossierModalProps> = ({ item, onClose }) => {
  const details = item.historicalDetails || {
    originalMsrp: `₹${item.purchaseValue.toLocaleString('en-IN')}`,
    carrierLock: 'Unlocked (Factory)',
    batteryHealth: '84% Capacity',
    depreciation: '-57.9% over 48mo',
    transactionRef: 'TXN-881920-OK',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 border border-[#e3e1ec] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-1 border-b border-[#eeedf7]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0051d5]">fact_check</span>
            <h4 className="font-semibold text-[15px] text-[#1a1b22]">
              Asset Ledger {item.code}
            </h4>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#eeedf7] flex items-center justify-center text-[#45474a] hover:text-[#1a1b22]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="bg-[#f4f2fd] rounded-xl p-2.5 flex flex-col gap-1.5 font-mono text-[11px] border border-[#e3e1ec]/50">
          <div className="flex justify-between py-1 bg-white/70 px-2 rounded-lg">
            <span className="text-[#45474a]">Original MSRP</span>
            <span className="text-[#1a1b22] font-semibold">{details.originalMsrp}</span>
          </div>
          <div className="flex justify-between py-1 px-2">
            <span className="text-[#45474a]">Carrier / Status</span>
            <span className="text-[#069669] font-medium">{details.carrierLock}</span>
          </div>
          <div className="flex justify-between py-1 bg-white/70 px-2 rounded-lg">
            <span className="text-[#45474a]">Component State</span>
            <span className="text-[#1a1b22]">{details.batteryHealth}</span>
          </div>
          <div className="flex justify-between py-1 px-2">
            <span className="text-[#45474a]">Depreciation</span>
            <span className="text-[#1a1b22] font-medium">{details.depreciation}</span>
          </div>
          {details.transactionRef && (
            <div className="flex justify-between py-1 bg-white/70 px-2 rounded-lg">
              <span className="text-[#45474a]">Escrow Ledger</span>
              <span className="text-[#0051d5] font-semibold">{details.transactionRef}</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-[#121417] text-white text-[13px] font-semibold flex items-center justify-center hover:bg-[#1a1c1f] transition-colors"
        >
          Dismiss Dossier
        </button>
      </div>
    </div>
  );
};
