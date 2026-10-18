import React, { useState, useEffect } from 'react';
import { InventoryItem, ScreenType } from '../../types/inventory';
import { EditFieldsModal } from '../modals/EditFieldsModal';
import { detectAssetGeoLocation } from '../../utils/geolocation';
import { resolveDisplayAssetId } from '../../utils/assetId';

interface DossierScreenProps {
  item: InventoryItem;
  onNavigate: (screen: ScreenType) => void;
  onSaveDossier: (updatedItem: InventoryItem) => void;
  onInspectImage?: (item: InventoryItem) => void;
}

export const DossierScreen: React.FC<DossierScreenProps> = ({
  item,
  onNavigate,
  onSaveDossier,
  onInspectImage,
}) => {
  const [currentDossier, setCurrentDossier] = useState<InventoryItem>(item);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingManualLoc, setIsEditingManualLoc] = useState(false);
  const [manualLocDraft, setManualLocDraft] = useState(item.location || 'Personal Vault');
  const [isDetectingGeo, setIsDetectingGeo] = useState(false);

  useEffect(() => {
    setCurrentDossier(item);
    setManualLocDraft(item.location || 'Personal Vault');
  }, [item]);

  const unifiedAssetId = resolveDisplayAssetId(currentDossier);

  const handleConfirmSave = () => {
    setIsSaved(true);
    onSaveDossier(currentDossier);
    setTimeout(() => {
      onNavigate('inventory');
    }, 1200);
  };

  const handleSaveInlineManualLocation = () => {
    const nextLoc = manualLocDraft.trim() || 'Personal Vault';
    const updated: InventoryItem = {
      ...currentDossier,
      location: nextLoc,
    };
    setCurrentDossier(updated);
    onSaveDossier(updated);
    setIsEditingManualLoc(false);
  };

  const handleDetectDossierGeo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetectingGeo(true);
    try {
      const resolved = await detectAssetGeoLocation(null);
      if (resolved?.formattedAddress) {
        const updated: InventoryItem = {
          ...currentDossier,
          geoLocation: resolved.formattedAddress,
        };
        setCurrentDossier(updated);
        onSaveDossier(updated);
      }
    } finally {
      setIsDetectingGeo(false);
    }
  };

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl lg:max-w-5xl mx-auto px-4 lg:px-8 pt-20 lg:pt-6 pb-28 lg:pb-12 gap-4 select-none">
      {/* Optical Scan Result Banner Card */}
      <section className="w-full bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3.5 border border-[#e3e1ec]">
        <div className="flex gap-4 items-center">
          {/* Thumbnail with scan reticle effect — clickable for full-screen HD view */}
          <button
            type="button"
            onClick={() => onInspectImage?.(currentDossier)}
            title="Click to inspect full-screen HD image"
            className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#eeedf7] shrink-0 flex items-center justify-center border border-[#c6c6ca]/40 group cursor-zoom-in"
          >
            <img
              src={currentDossier.imageUrl}
              alt={currentDossier.imageAlt || currentDossier.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[#0051d5]/10 group-hover:bg-black/35 flex items-center justify-center pointer-events-none transition-colors">
              <span className="material-symbols-outlined text-[#0051d5] group-hover:text-white text-[24px] transition-colors">
                fullscreen
              </span>
            </div>
            <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur rounded px-1 flex items-center shadow-xs">
              <span className="material-symbols-outlined text-[12px] text-[#069669]">verified</span>
            </div>
          </button>

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
      <div
        onClick={() => handleCopy('Asset ID', unifiedAssetId)}
        className="bg-[#e8e7f1] rounded-xl px-4 py-3 flex items-center justify-between border border-[#c6c6ca]/40 cursor-pointer hover:bg-[#e3e1ec] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[17px] text-[#0051d5]">fingerprint</span>
          <span className="font-mono text-[10px] text-[#45474a] uppercase tracking-wider font-semibold">
            Assigned Vault Asset ID
          </span>
        </div>
        <span className="font-mono text-[13px] text-[#0051d5] font-bold bg-white px-2.5 py-0.5 rounded-lg shadow-sm border border-[#c6c6ca]/40 tabular-nums">
          {unifiedAssetId}
        </span>
      </div>

      {/* Structured Data Ledger */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-[#e3e1ec]">
        <div className="px-4 py-3 bg-[#f4f2fd] flex items-center justify-between border-b border-[#e3e1ec]">
          <span className="font-semibold text-[14px] text-[#1a1b22]">Digital Twin Dossier</span>
          <span className="font-mono text-[10px] text-[#45474a] font-semibold">
            13 PARAMETERS EXTRACTED
          </span>
        </div>

        {/* Field Rows */}
        <div className="flex flex-col divide-y divide-[#eeedf7]">
          {/* Asset ID */}
          <div
            onClick={() => handleCopy('Asset ID', unifiedAssetId)}
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                tag
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Asset ID</span>
            </div>
            <span className="font-mono text-[12px] text-[#0051d5] text-right font-bold tabular-nums truncate">
              {unifiedAssetId}
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

          {/* Purchase Date (Ownership) */}
          <div
            onClick={() =>
              handleCopy(
                'Purchase Date',
                currentDossier.purchaseDate || currentDossier.boughtDate || 'N/A'
              )
            }
            className="px-4 py-2.5 bg-[#f4f2fd]/30 flex items-center justify-between gap-3 hover:bg-[#f4f2fd] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#0051d5] shrink-0">
                calendar_today
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">
                Purchase Date (Ownership)
              </span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#1a1b22]">
              {currentDossier.purchaseDate || currentDossier.boughtDate || 'N/A'}
            </span>
          </div>

          {/* Manufacturing Date (MFD) */}
          <div
            onClick={() =>
              handleCopy('Manufacturing Date', currentDossier.manufacturingDate || 'N/A')
            }
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                precision_manufacturing
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">
                Manufacturing Date (MFD)
              </span>
            </div>
            <span className="font-mono text-[12px] text-[#1a1b22]">
              {currentDossier.manufacturingDate || 'N/A'}
            </span>
          </div>

          {/* Expiration Date (Medicines / Food / Consumables) */}
          <div
            onClick={() => handleCopy('Expiry Date', currentDossier.expiresDate || 'N/A')}
            className="px-4 py-2.5 bg-[#f4f2fd]/30 flex items-center justify-between gap-3 hover:bg-[#f4f2fd] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                event_available
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">
                Expiry Date (Meds / Food)
              </span>
            </div>
            <span
              className={`font-mono text-[12px] ${
                currentDossier.expiresDate && currentDossier.expiresDate !== 'N/A'
                  ? 'text-amber-800 font-semibold'
                  : 'text-[#1a1b22]'
              }`}
            >
              {currentDossier.expiresDate || 'N/A'}
            </span>
          </div>

          {/* Manual Storage Location & Box No (with direct inline update) */}
          <div className="px-4 py-2.5 bg-[#f4f2fd]/30 flex flex-col gap-2 hover:bg-[#f4f2fd] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div
                onClick={() => handleCopy('Manual Location', currentDossier.location || 'Personal Vault')}
                className="flex items-center gap-2 min-w-0 pt-0.5 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-[#45474a] shrink-0">
                  inventory_2
                </span>
                <span className="text-[12px] font-medium text-[#45474a]">Manual Location (Storage)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[12px] text-[#1a1b22] text-right font-semibold">
                    {currentDossier.location || 'Personal Vault'}
                  </span>
                  {currentDossier.boxNumber && currentDossier.boxNumber !== 'N/A' && (
                    <span className="font-mono text-[10px] text-[#45474a] text-right">
                      {currentDossier.boxNumber}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setManualLocDraft(currentDossier.location || 'Personal Vault');
                    setIsEditingManualLoc((prev) => !prev);
                  }}
                  title="Manually update storage location"
                  className="h-7 px-2 rounded-lg bg-[#e8eaf6] hover:bg-[#dbe1ff] text-[#0051d5] font-mono text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">edit_location_alt</span>
                  <span>Update</span>
                </button>
              </div>
            </div>

            {isEditingManualLoc && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={manualLocDraft}
                  onChange={(e) => setManualLocDraft(e.target.value)}
                  placeholder="Enter manual storage location (e.g. Bedroom Closet)"
                  className="flex-1 h-9 px-3 bg-white rounded-xl border border-[#0051d5]/40 text-[12px] text-[#1a1b22] outline-none focus:ring-2 focus:ring-[#0051d5]/25"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveInlineManualLocation}
                  className="h-9 px-3 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-semibold text-[11px] shrink-0"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingManualLoc(false)}
                  className="h-9 px-2.5 rounded-xl bg-[#eeedf7] text-[#45474a] font-medium text-[11px] shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Captured Geo Location (Photo Taken - Street, neighborhood, city, and state) */}
          <div
            onClick={() =>
              currentDossier.geoLocation && handleCopy('Geo Location', currentDossier.geoLocation)
            }
            className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-[#f4f2fd]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0 pt-0.5 shrink-0">
              <span className="material-symbols-outlined text-[16px] text-[#0051d5] shrink-0">
                location_on
              </span>
              <span className="text-[12px] font-medium text-[#45474a]">Geo Location (Photo Taken)</span>
            </div>
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="font-mono text-[11px] text-[#1a1b22] text-right break-words max-w-[230px]">
                {currentDossier.geoLocation || 'Not captured yet'}
              </span>
              <button
                type="button"
                onClick={handleDetectDossierGeo}
                disabled={isDetectingGeo}
                title="Detect or refresh current GPS Geo Location"
                className="h-7 px-2 rounded-lg bg-[#e8eaf6] hover:bg-[#dbe1ff] text-[#0051d5] font-mono text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
              >
                <span
                  className={`material-symbols-outlined text-[13px] ${
                    isDetectingGeo ? 'animate-spin' : ''
                  }`}
                >
                  {isDetectingGeo ? 'progress_activity' : 'my_location'}
                </span>
                <span>{currentDossier.geoLocation ? 'Refresh' : 'Detect'}</span>
              </button>
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
