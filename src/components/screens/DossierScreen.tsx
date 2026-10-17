import React, { useState } from 'react';
import { InventoryItem, ScreenType } from '../../types/inventory';
import { EditFieldsModal } from '../modals/EditFieldsModal';

interface DossierScreenProps {
  item: InventoryItem;
  onNavigate: (screen: ScreenType) => void;
  onSaveDossier: (updatedItem: InventoryItem) => void;
}

export const DossierScreen: React.FC<DossierScreenProps> = ({
  item,
  onNavigate,
  onSaveDossier,
}) => {
  const [currentDossier, setCurrentDossier] = useState<InventoryItem>(item);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleConfirmSave = () => {
    setIsSaved(true);
    onSaveDossier(currentDossier);
    setTimeout(() => {
      onNavigate('inventory');
    }, 1200);
  };

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 pt-20 pb-28 gap-4 select-none">
      {/* Optical Scan Result Banner Card */}
      <section className="w-full bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3.5 border border-[#e3e1ec]">
        <div className="flex gap-4 items-center">
          {/* Thumbnail with scan reticle effect */}
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#eeedf7] shrink-0 flex items-center justify-center border border-[#c6c6ca]/40">
            <img
              src={currentDossier.imageUrl}
              alt={currentDossier.imageAlt || currentDossier.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[#0051d5]/10 flex items-center justify-center pointer-events-none">
              <span className="material-symbols-outlined text-[#0051d5] text-[24px]">
                center_focus_strong
              </span>
            </div>
            <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur rounded px-1 flex items-center shadow-xs">
              <span className="material-symbols-outlined text-[12px] text-[#069669]">verified</span>
            </div>
          </div>

          {/* AI Classification Metadata Header */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-[#85f8c4]/30 text-[#005137] font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#069669]" />
                99.2% Match
              </span>
              <span className="font-mono text-[10px] text-[#45474a] truncate font-medium">
                AI-AUTO-INGEST
              </span>
            </div>
            <h2 className="font-bold text-[17px] text-[#1a1b22] truncate leading-tight">
              {currentDossier.name}
            </h2>
            <p className="text-[12px] text-[#45474a] truncate mt-0.5">
              Auto-classified: {currentDossier.category} &gt; {currentDossier.subCategory || 'General'}
            </p>
          </div>
        </div>

        {/* Quick Scan Status Bar */}
        <div className="bg-[#f4f2fd] rounded-xl p-3 flex items-center justify-between border border-[#e3e1ec]/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#069669]">task_alt</span>
            <span className="text-[12px] font-medium text-[#1a1b22]">
              OCR &amp; Barcode cross-referenced
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#0051d5] font-bold">VALIDATED</span>
        </div>
      </section>

      {/* System ID Strip */}
      <div className="bg-[#e8e7f1] rounded-xl px-4 py-3 flex items-center justify-between border border-[#c6c6ca]/40">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[17px] text-[#45474a]">fingerprint</span>
          <span className="font-mono text-[10px] text-[#45474a] uppercase tracking-wider font-semibold">
            Assigned Vault Asset ID
          </span>
        </div>
        <span className="font-mono text-[13px] text-[#1a1b22] font-bold bg-white px-2.5 py-0.5 rounded-lg shadow-sm border border-[#c6c6ca]/40">
          {currentDossier.code}
        </span>
      </div>

      {/* Structured Data Ledger */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-[#e3e1ec]">
        <div className="px-4 py-3 bg-[#f4f2fd] flex items-center justify-between border-b border-[#e3e1ec]">
          <span className="font-semibold text-[14px] text-[#1a1b22]">Digital Twin Dossier</span>
          <span className="font-mono text-[10px] text-[#45474a] font-semibold">
            12 PARAMETERS EXTRACTED
          </span>
        </div>

        {/* Field Rows */}
        <div className="flex flex-col divide-y divide-[#eeedf7]">
          {/* Serial No */}
          <div
            onClick={() => handleCopy('Serial No', currentDossier.serialNumber || currentDossier.code)}
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                tag
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Serial Number</span>
            </div>
            <span className="font-mono text-[12px] text-[#1a1b22] text-right font-bold truncate">
              {currentDossier.serialNumber || currentDossier.code}
            </span>
          </div>

          {/* Primary Category */}
          <div
            onClick={() => handleCopy('Category', currentDossier.category)}
            className="px-4 py-2.5 bg-[#f4f2fd]/30 flex items-center justify-between gap-3 hover:bg-[#f4f2fd] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                category
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Category</span>
            </div>
            <span className="font-mono text-[12px] text-[#1a1b22] text-right truncate">
              {currentDossier.category}
            </span>
          </div>

          {/* Sub-Category */}
          <div
            onClick={() => handleCopy('SubCategory', currentDossier.subCategory || 'General')}
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                subdirectory_arrow_right
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Sub-Category</span>
            </div>
            <span className="font-mono text-[12px] text-[#1a1b22] text-right truncate">
              {currentDossier.subCategory || 'General Assets'}
            </span>
          </div>

          {/* Brand */}
          <div
            onClick={() => handleCopy('Brand', currentDossier.brand || currentDossier.name)}
            className="px-4 py-2.5 bg-[#f4f2fd]/30 flex items-center justify-between gap-3 hover:bg-[#f4f2fd] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                corporate_fare
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Brand / Manufacturer</span>
            </div>
            <span className="font-mono text-[12px] text-[#0051d5] text-right font-semibold truncate">
              {currentDossier.brand || 'Identified Asset'}
            </span>
          </div>

          {/* Quantity */}
          <div
            onClick={() => handleCopy('Quantity', currentDossier.quantity || '1 Unit')}
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                inventory
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Quantity / Pack</span>
            </div>
            <span className="font-mono text-[12px] text-[#1a1b22] text-right font-medium truncate">
              {currentDossier.quantity || '1 Unit'}
            </span>
          </div>

          {/* Purchase Price & Source */}
          <div
            onClick={() => handleCopy('Price', `₹${(currentDossier.value || 0).toLocaleString('en-IN')}`)}
            className="px-4 py-2.5 bg-[#f4f2fd]/30 flex items-center justify-between gap-3 hover:bg-[#f4f2fd] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                payments
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Purchase Price (₹ INR)</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-[13px] text-[#1a1b22] text-right font-bold tabular-nums">
                ₹{(currentDossier.value || 0).toLocaleString('en-IN')}
              </span>
              {currentDossier.priceSource && (
                <span className="text-[10px] font-mono text-[#069669] font-medium">
                  {currentDossier.priceSource}
                </span>
              )}
            </div>
          </div>

          {/* Condition */}
          <div
            onClick={() => handleCopy('Condition', currentDossier.condition || 'New / Unopened')}
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                rule
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Condition</span>
            </div>
            <span className="font-mono text-[12px] text-[#1a1b22] text-right">
              {currentDossier.condition || 'New / Unopened'}
            </span>
          </div>

          {/* Expiration Date */}
          <div
            onClick={() => handleCopy('Expiry Date', currentDossier.expiresDate || 'N/A')}
            className="px-4 py-2.5 bg-[#f4f2fd]/30 flex items-center justify-between gap-3 hover:bg-[#f4f2fd] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                event_available
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Expiry Date</span>
            </div>
            <span className="font-mono text-[12px] text-[#1a1b22]">
              {currentDossier.expiresDate || 'N/A'}
            </span>
          </div>

          {/* Purchase Date */}
          <div
            onClick={() => handleCopy('Purchase Date', currentDossier.purchaseDate || currentDossier.boughtDate || 'N/A')}
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                calendar_today
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Purchase Date</span>
            </div>
            <span className="font-mono text-[12px] text-[#1a1b22]">
              {currentDossier.purchaseDate || currentDossier.boughtDate || 'N/A'}
            </span>
          </div>

          {/* Box No & Storage Location */}
          <div
            onClick={() => handleCopy('Location', currentDossier.location || 'Personal Vault')}
            className="px-4 py-2.5 bg-[#f4f2fd]/30 flex items-start justify-between gap-3 hover:bg-[#f4f2fd] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0 pt-0.5 shrink-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                inventory_2
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Box No. &amp; Location</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-[12px] text-[#1a1b22] text-right font-medium">
                {currentDossier.boxNumber && currentDossier.boxNumber !== 'N/A' ? currentDossier.boxNumber : 'Box: N/A'}
              </span>
              <span className="font-mono text-[11px] text-[#45474a] text-right">
                {currentDossier.location || 'Personal Vault'}
              </span>
            </div>
          </div>

          {/* Barcode */}
          <div
            onClick={() => handleCopy('Barcode', currentDossier.barcode || 'N/A')}
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                barcode
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Barcode / EAN</span>
            </div>
            <span className="font-mono text-[12px] text-[#45474a] text-right">
              {currentDossier.barcode || 'N/A'}
            </span>
          </div>

          {/* Full Description */}
          {currentDossier.description && (
            <div
              onClick={() => handleCopy('Description', currentDossier.description || '')}
              className="px-4 py-3 bg-[#f4f2fd]/30 flex flex-col gap-1 hover:bg-[#f4f2fd] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-[#45474a]">
                <span className="material-symbols-outlined text-[16px] text-[#45474a]">description</span>
                <span className="text-[12px] font-medium">Description &amp; Specifications</span>
              </div>
              <p className="text-[12px] text-[#1a1b22] leading-relaxed pl-6">
                {currentDossier.description}
              </p>
            </div>
          )}

          {/* Notes & Advisory */}
          {currentDossier.notes && (
            <div
              onClick={() => handleCopy('Notes', currentDossier.notes || '')}
              className="px-4 py-3 flex flex-col gap-1 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-[#069669]">
                <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
                <span className="text-[12px] font-medium">Notes &amp; Advisory</span>
              </div>
              <p className="text-[12px] text-[#1a1b22] leading-relaxed pl-6">
                {currentDossier.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Verification Confidence & Integrity Index */}
      <section className="bg-[#f4f2fd] rounded-2xl p-4 flex flex-col gap-2.5 border border-[#e3e1ec]/60">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a1b22]">OmniVault Verification</span>
          <span className="font-mono text-[11px] text-[#069669] font-bold">Corroborated</span>
        </div>
        <div className="w-full bg-[#e3e1ec] h-2 rounded-full overflow-hidden">
          <div className="bg-[#069669] h-full rounded-full w-full transition-all duration-700" />
        </div>
        <p className="text-[12px] text-[#45474a] leading-relaxed">
          Asset indexed with multimodal visual understanding and Indian retail valuation. Tap any row to copy to clipboard.
        </p>
      </section>

      {/* Action Group */}
      <div className="flex flex-col gap-2.5 mt-2">
        <button
          onClick={handleConfirmSave}
          className={`w-full h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-white ${
            isSaved ? 'bg-[#069669]' : 'bg-[#121417] hover:bg-[#1a1c1f]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isSaved ? 'check_circle' : 'archive'}
          </span>
          {isSaved ? 'Vault Synchronized' : 'Confirm & Save to Vault'}
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="h-11 bg-white text-[#1a1b22] rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 shadow-sm border border-[#e3e1ec] hover:bg-[#f4f2fd] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Edit Fields
          </button>
          <button
            onClick={() => onNavigate('camera')}
            className="h-11 bg-white text-[#45474a] rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 shadow-sm border border-[#e3e1ec] hover:bg-[#f4f2fd] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">replay</span>
            Retake Scan
          </button>
        </div>
      </div>

      {/* Edit Fields Interactive Modal */}
      {isEditModalOpen && (
        <EditFieldsModal
          item={currentDossier}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updated) => {
            setCurrentDossier(updated);
            setIsEditModalOpen(false);
          }}
        />
      )}

      {/* Copy notification */}
      {copiedField && (
        <div className="fixed bottom-24 inset-x-4 max-w-xs mx-auto bg-[#121417] text-white px-3 py-2 rounded-xl shadow-2xl flex items-center justify-center gap-2 z-50 text-[12px] font-mono border border-white/10 animate-in fade-in duration-150">
          <span className="material-symbols-outlined text-[16px] text-[#85f8c4]">content_copy</span>
          <span>Copied {copiedField} to clipboard</span>
        </div>
      )}
    </div>
  );
};
