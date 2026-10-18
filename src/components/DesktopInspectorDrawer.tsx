import React, { useState, useEffect } from 'react';
import { InventoryItem, ScreenType } from '../types/inventory';
import { EditFieldsModal } from './modals/EditFieldsModal';
import { detectAssetGeoLocation } from '../utils/geolocation';
import { resolveCanonicalCategoryName } from '../utils/categoryTaxonomy';
import { resolveDisplayAssetId } from '../utils/assetId';

interface DesktopInspectorDrawerProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onSaveDossier: (updatedItem: InventoryItem) => void;
  onNavigate: (screen: ScreenType) => void;
  onInspectImage?: (item: InventoryItem) => void;
  onArchiveItem?: (itemId: string) => void;
  onDuplicateItem?: (item: InventoryItem) => void;
}

export const DesktopInspectorDrawer: React.FC<DesktopInspectorDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onSaveDossier,
  onNavigate,
  onInspectImage,
  onArchiveItem,
  onDuplicateItem,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditingManualLoc, setIsEditingManualLoc] = useState(false);
  const [manualLocDraft, setManualLocDraft] = useState(item.location || 'Personal Vault');
  const [boxNoDraft, setBoxNoDraft] = useState(item.boxNumber || '');
  const [isDetectingGeo, setIsDetectingGeo] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  useEffect(() => {
    setManualLocDraft(item.location || 'Personal Vault');
    setBoxNoDraft(item.boxNumber || '');
    setIsEditingManualLoc(false);
  }, [item]);

  if (!isOpen) return null;

  const unifiedAssetId = resolveDisplayAssetId(item);

  const showToast = (msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2400);
  };

  const handleCopy = (label: string, value: string) => {
    if (!value || value === 'N/A') return;
    navigator.clipboard?.writeText(value);
    showToast(`Copied ${label} to clipboard`);
  };

  const handleSaveInlineManualLocation = () => {
    const trimmedLoc = manualLocDraft.trim() || 'Personal Vault';
    const trimmedBox = boxNoDraft.trim() || item.boxNumber;
    onSaveDossier({
      ...item,
      location: trimmedLoc,
      boxNumber: trimmedBox,
    });
    setIsEditingManualLoc(false);
    showToast('Manual Storage Location updated');
  };

  const handleDetectGeo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetectingGeo(true);
    try {
      const resolved = await detectAssetGeoLocation(null);
      if (resolved?.formattedAddress) {
        onSaveDossier({
          ...item,
          geoLocation: resolved.formattedAddress,
        });
        showToast('Geo Location updated from GPS');
      } else {
        showToast('Unable to detect GPS location');
      }
    } catch {
      showToast('Location permission unavailable');
    } finally {
      setIsDetectingGeo(false);
    }
  };

  const handleAdjustQuantity = (delta: number) => {
    const rawQty = item.quantity || '1 Unit';
    const match = rawQty.match(/(\d+)/);
    const currentNum = match ? parseInt(match[1], 10) : 1;
    const nextNum = Math.max(1, currentNum + delta);
    const unitSuffix = rawQty.replace(/^\d+\s*/, '').trim() || (nextNum === 1 ? 'Unit' : 'Units');
    const nextQuantity = `${nextNum} ${unitSuffix}`;
    onSaveDossier({
      ...item,
      quantity: nextQuantity,
    });
    showToast(`Quantity updated to ${nextQuantity}`);
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[390px] xl:w-[430px] shrink-0 h-[calc(100vh-64px)] sticky top-16 bg-white border-l border-[#e3e1ec] select-none z-30">
        {/* Sticky Inspector Header */}
        <div className="px-5 py-3.5 border-b border-[#e3e1ec] flex items-center justify-between gap-2 bg-[#fbf8ff]">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-[#0051d5] tracking-wider uppercase">
                LIVE DOSSIER INSPECTOR
              </span>
              <span className="text-[#c6c6ca]">·</span>
              <button
                type="button"
                onClick={() => handleCopy('Asset ID', unifiedAssetId)}
                title="Click to copy Asset ID"
                className="font-mono text-[11px] text-[#0051d5] font-bold truncate hover:underline"
              >
                {unifiedAssetId}
              </button>
            </div>
            <h3 className="font-bold text-[15px] text-[#1a1b22] truncate mt-0.5">
              {item.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              title="Edit all dossier fields"
              className="h-8 px-2.5 rounded-lg bg-[#f4f2fd] hover:bg-[#dbe1ff] text-[#0051d5] text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dossier')}
              title="Open full-page Dossier view"
              className="w-8 h-8 rounded-lg hover:bg-[#eeedf7] text-[#45474a] hover:text-[#1a1b22] flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">open_in_full</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close inspector drawer"
              className="w-8 h-8 rounded-lg hover:bg-[#eeedf7] text-[#45474a] hover:text-[#1a1b22] flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* High-Res Asset Preview with Full-Screen Zoom Trigger */}
          <div
            onClick={() => onInspectImage?.(item)}
            className="relative w-full h-52 rounded-2xl bg-[#121417] overflow-hidden border border-[#e3e1ec] group cursor-zoom-in shrink-0"
          >
            <img
              src={item.imageUrl}
              alt={item.imageAlt || item.name}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span className="bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/15">
                {unifiedAssetId}
              </span>
              <span className="bg-black/60 backdrop-blur-md text-white font-mono text-[10px] px-2.5 py-1 rounded-md border border-white/15 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">zoom_in</span>
                <span>Full Screen</span>
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-[10px] text-white/80">
                  {resolveCanonicalCategoryName(item)}
                  {item.subCategory ? ` · ${item.subCategory}` : ''}
                </span>
                <span className="text-[14px] font-bold text-white truncate">
                  {item.name}
                </span>
              </div>
              <span className="font-mono text-[16px] font-bold text-white tabular-nums shrink-0">
                ₹{(item.value || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Executive Metrics & Inline Quantity Stepper */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#f4f2fd] p-3 rounded-xl border border-[#e3e1ec]/80 flex flex-col justify-between">
              <span className="font-mono text-[10px] text-[#45474a]">APPRAISED VALUE</span>
              <div className="flex items-baseline justify-between gap-1 mt-1">
                <span className="font-mono text-[17px] font-bold text-[#1a1b22] tabular-nums">
                  ₹{(item.value || 0).toLocaleString('en-IN')}
                </span>
                <span className="font-mono text-[10px] text-[#069669] truncate">
                  {item.priceSource || 'INR'}
                </span>
              </div>
            </div>

            <div className="bg-[#f4f2fd] p-3 rounded-xl border border-[#e3e1ec]/80 flex flex-col justify-between">
              <span className="font-mono text-[10px] text-[#45474a]">STOCK QUANTITY</span>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="font-mono text-[14px] font-bold text-[#1a1b22] tabular-nums truncate">
                  {item.quantity || '1 Unit'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAdjustQuantity(-1)}
                    className="w-6 h-6 rounded-md bg-white hover:bg-[#eeedf7] border border-[#c6c6ca]/60 text-[#1a1b22] flex items-center justify-center font-mono text-[13px] font-bold transition-colors"
                    title="Decrease quantity"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustQuantity(1)}
                    className="w-6 h-6 rounded-md bg-[#0051d5] hover:bg-[#316bf3] text-white flex items-center justify-center font-mono text-[13px] font-bold transition-colors"
                    title="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Location Module: Manual Storage Location + Captured Geo Location */}
          <div className="bg-white rounded-2xl border border-[#e3e1ec] divide-y divide-[#eeedf7] overflow-hidden">
            {/* Manual Location (Storage) */}
            <div className="p-3.5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[17px] text-[#45474a] shrink-0">
                    inventory_2
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-[10px] text-[#45474a]">
                      MANUAL LOCATION (STORAGE)
                    </span>
                    <span className="text-[13px] font-semibold text-[#1a1b22] break-words">
                      {item.location || 'Personal Vault'}
                      {item.boxNumber && item.boxNumber !== 'N/A' ? ` · ${item.boxNumber}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingManualLoc((prev) => !prev)}
                  className="h-7 px-2.5 rounded-lg bg-[#f4f2fd] hover:bg-[#dbe1ff] text-[#0051d5] font-mono text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">edit_location_alt</span>
                  <span>{isEditingManualLoc ? 'Close' : 'Update'}</span>
                </button>
              </div>

              {isEditingManualLoc && (
                <div className="pt-2 flex flex-col gap-2 border-t border-[#eeedf7]">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={manualLocDraft}
                      onChange={(e) => setManualLocDraft(e.target.value)}
                      placeholder="Storage location (e.g. Study Rack 2)"
                      className="col-span-2 h-8 px-2.5 bg-[#f4f2fd] rounded-lg border border-[#0051d5]/30 text-[12px] text-[#1a1b22] outline-none focus:bg-white"
                    />
                    <input
                      type="text"
                      value={boxNoDraft}
                      onChange={(e) => setBoxNoDraft(e.target.value)}
                      placeholder="Box No."
                      className="col-span-1 h-8 px-2.5 bg-[#f4f2fd] rounded-lg border border-[#0051d5]/30 font-mono text-[11px] text-[#1a1b22] outline-none focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingManualLoc(false)}
                      className="h-7 px-2.5 rounded-lg bg-[#eeedf7] text-[#45474a] text-[11px] font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInlineManualLocation}
                      className="h-7 px-3 rounded-lg bg-[#0051d5] hover:bg-[#316bf3] text-white text-[11px] font-semibold"
                    >
                      Save Location
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Captured Geo Location (Photo Taken) */}
            <div className="p-3.5 flex items-start justify-between gap-2">
              <div
                onClick={() => item.geoLocation && handleCopy('Geo Location', item.geoLocation)}
                className="flex items-start gap-2 min-w-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px] text-[#0051d5] shrink-0 mt-0.5">
                  location_on
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[10px] text-[#45474a]">
                    GEO LOCATION (PHOTO TAKEN)
                  </span>
                  <span className="font-mono text-[11px] text-[#1a1b22] leading-snug break-words mt-0.5">
                    {item.geoLocation || 'Not captured yet'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetectGeo}
                disabled={isDetectingGeo}
                className="h-7 px-2.5 rounded-lg bg-[#f4f2fd] hover:bg-[#dbe1ff] text-[#0051d5] font-mono text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
              >
                <span
                  className={`material-symbols-outlined text-[13px] ${
                    isDetectingGeo ? 'animate-spin' : ''
                  }`}
                >
                  {isDetectingGeo ? 'progress_activity' : 'my_location'}
                </span>
                <span>{item.geoLocation ? 'Refresh' : 'Detect'}</span>
              </button>
            </div>
          </div>

          {/* Complete Specification Ledger */}
          <div className="bg-white rounded-2xl border border-[#e3e1ec] divide-y divide-[#eeedf7] overflow-hidden text-[12px]">
            <div className="px-3.5 py-2 bg-[#f4f2fd] flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold text-[#45474a] tracking-wider">
                SPECIFICATION LEDGER
              </span>
              <span className="font-mono text-[10px] text-[#45474a]">Click row to copy</span>
            </div>

            <div
              onClick={() => handleCopy('Asset ID', unifiedAssetId)}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f8f7fd] cursor-pointer"
            >
              <span className="text-[#45474a]">Asset ID</span>
              <span className="font-mono text-[11px] font-bold text-[#0051d5] text-right tabular-nums">
                {unifiedAssetId}
              </span>
            </div>

            <div
              onClick={() => handleCopy('Brand', item.brand || 'Generic / Unbranded')}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f8f7fd] cursor-pointer"
            >
              <span className="text-[#45474a]">Brand / Manufacturer</span>
              <span className="font-semibold text-[#1a1b22] text-right">
                {item.brand || 'Generic / Unbranded'}
              </span>
            </div>

            <div
              onClick={() => handleCopy('Category', resolveCanonicalCategoryName(item))}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f8f7fd] cursor-pointer"
            >
              <span className="text-[#45474a]">Category</span>
              <span className="font-mono text-[11px] text-[#1a1b22] text-right">
                {resolveCanonicalCategoryName(item)}
                {item.subCategory ? ` / ${item.subCategory}` : ''}
              </span>
            </div>

            <div
              onClick={() => handleCopy('Condition', item.condition || 'New / Unopened')}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f8f7fd] cursor-pointer"
            >
              <span className="text-[#45474a]">Condition</span>
              <span className="font-mono text-[11px] text-[#1a1b22] text-right">
                {item.condition || 'New / Unopened'}
              </span>
            </div>

            <div
              onClick={() =>
                handleCopy('Purchase Date', item.purchaseDate || item.boughtDate || 'N/A')
              }
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f8f7fd] cursor-pointer"
            >
              <span className="text-[#45474a]">Purchase Date (Ownership)</span>
              <span className="font-mono text-[11px] font-semibold text-[#1a1b22] tabular-nums">
                {item.purchaseDate || item.boughtDate || 'N/A'}
              </span>
            </div>

            <div
              onClick={() =>
                handleCopy('Manufacturing Date', item.manufacturingDate || 'N/A')
              }
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f8f7fd] cursor-pointer"
            >
              <span className="text-[#45474a]">Manufacturing Date (MFD)</span>
              <span className="font-mono text-[11px] text-[#1a1b22] tabular-nums">
                {item.manufacturingDate || 'N/A'}
              </span>
            </div>

            <div
              onClick={() => handleCopy('Expiry Date', item.expiresDate || 'N/A')}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f8f7fd] cursor-pointer"
            >
              <span className="text-[#45474a]">Expiry Date (Meds / Food)</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  item.expiresDate && item.expiresDate !== 'N/A'
                    ? 'text-amber-800 font-semibold'
                    : 'text-[#1a1b22]'
                }`}
              >
                {item.expiresDate || 'N/A'}
              </span>
            </div>

            <div
              onClick={() => handleCopy('Barcode', item.barcode || 'N/A')}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#f8f7fd] cursor-pointer"
            >
              <span className="text-[#45474a]">Barcode / EAN</span>
              <span className="font-mono text-[11px] text-[#45474a] tabular-nums">
                {item.barcode || 'N/A'}
              </span>
            </div>

            {item.description && (
              <div
                onClick={() => handleCopy('Description', item.description || '')}
                className="px-3.5 py-2.5 flex flex-col gap-1 hover:bg-[#f8f7fd] cursor-pointer"
              >
                <span className="text-[#45474a] text-[11px] font-medium">
                  Description &amp; Specifications
                </span>
                <p className="text-[12px] text-[#1a1b22] leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {item.notes && (
              <div
                onClick={() => handleCopy('Notes', item.notes || '')}
                className="px-3.5 py-2.5 flex flex-col gap-1 hover:bg-[#f8f7fd] cursor-pointer"
              >
                <span className="text-[#069669] text-[11px] font-medium">
                  Notes &amp; Advisory
                </span>
                <p className="text-[12px] text-[#1a1b22] leading-relaxed">{item.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Inspector Footer Actions */}
        <div className="p-4 border-t border-[#e3e1ec] bg-[#fbf8ff] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex-1 h-9 px-3 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Edit Dossier Fields</span>
          </button>

          {onDuplicateItem && (
            <button
              type="button"
              onClick={() => {
                onDuplicateItem(item);
                showToast(`Duplicated "${item.name}"`);
              }}
              title="Duplicate Asset"
              className="w-9 h-9 rounded-xl bg-white hover:bg-[#eeedf7] border border-[#e3e1ec] text-[#45474a] hover:text-[#1a1b22] flex items-center justify-center shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">content_copy</span>
            </button>
          )}

          {onArchiveItem && (
            <button
              type="button"
              onClick={() => {
                onArchiveItem(item.id);
                showToast(`Moved "${item.name}" to Archive`);
              }}
              title="Move Asset to Archive"
              className="w-9 h-9 rounded-xl bg-white hover:bg-[#ffdad6]/50 border border-[#e3e1ec] text-[#ba1a1a] flex items-center justify-center shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">archive</span>
            </button>
          )}
        </div>

        {toastText && (
          <div className="absolute bottom-16 inset-x-4 bg-[#121417] text-white px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 text-[11px] font-medium z-50">
            <span className="material-symbols-outlined text-[15px] text-[#069669]">
              check_circle
            </span>
            <span className="truncate">{toastText}</span>
          </div>
        )}
      </aside>

      {isEditModalOpen && (
        <EditFieldsModal
          item={item}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updated) => {
            onSaveDossier(updated);
            setIsEditModalOpen(false);
            showToast('Asset Dossier saved & synced');
          }}
        />
      )}
    </>
  );
};
