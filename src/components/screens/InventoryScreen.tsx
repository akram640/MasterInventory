import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ScreenType } from '../../types/inventory';
import {
  computeUnifiedCategories,
  doesItemMatchCategory,
  resolveCanonicalCategoryName,
} from '../../utils/categoryTaxonomy';
import { resolveDisplayAssetId } from '../../utils/assetId';

interface InventoryScreenProps {
  items: InventoryItem[];
  selectedDossierId?: string;
  onSelectDossierItem: (item: InventoryItem) => void;
  onNavigate: (screen: ScreenType) => void;
  onArchiveItems: (itemIds: string[]) => void;
  onDuplicateItem: (item: InventoryItem) => void;
  initialCategoryFilter?: string | null;
  onCategoryChange?: (categoryName: string) => void;
  onInspectImage?: (item: InventoryItem) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  items,
  selectedDossierId,
  onSelectDossierItem,
  onNavigate,
  onArchiveItems,
  onDuplicateItem,
  initialCategoryFilter = 'All',
  onCategoryChange,
  onInspectImage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryFilter || 'All');
  const [sortBy, setSortBy] = useState<'recently_added' | 'expiring_soon' | 'highest_value'>('recently_added');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'table' : 'grid'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Active' | 'In Storage' | 'Archived'>('Active');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategoryFilter) {
      setSelectedCategory(initialCategoryFilter);
    }
  }, [initialCategoryFilter]);

  const handleRowOrCardSelect = (item: InventoryItem) => {
    onSelectDossierItem(item);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onNavigate('dossier');
    }
  };

  // Dynamically compute real categories and item counts identically to Home screen (DashboardScreen)
  const categories = useMemo(() => {
    const unified = computeUnifiedCategories(items).map((cat) => ({
      label: cat.name,
      count: cat.count,
    }));

    return [{ label: 'All', count: items.length }, ...unified];
  }, [items]);

  // Filtering and sorting
  const filteredItems = useMemo(() => {
    let list = [...items];

    // Category filter
    if (selectedCategory !== 'All') {
      list = list.filter((item) => doesItemMatchCategory(item, selectedCategory));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        const assetId = resolveDisplayAssetId(item).toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          assetId.includes(q) ||
          item.code.toLowerCase().includes(q) ||
          (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          item.subname.toLowerCase().includes(q) ||
          (item.location && item.location.toLowerCase().includes(q)) ||
          (item.geoLocation && item.geoLocation.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    if (sortBy === 'highest_value') {
      list.sort((a, b) => (b.value || 0) - (a.value || 0));
    } else if (sortBy === 'expiring_soon') {
      list.sort((a, b) => {
        if (a.status === 'Warning') return -1;
        if (b.status === 'Warning') return 1;
        return 0;
      });
    }

    return list;
  }, [items, selectedCategory, searchQuery, sortBy]);

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleExportSelected = () => {
    const dataToExport = filteredItems.filter((i) => selectedIds.includes(i.id));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', jsonStr);
    dlAnchor.setAttribute('download', `omnivault_export_${Date.now()}.json`);
    dlAnchor.click();

    setFeedbackToast(`Exported ${selectedIds.length} item records as JSON.`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleArchiveBatch = () => {
    onArchiveItems(selectedIds);
    setFeedbackToast(`Moved ${selectedIds.length} items to Vault Archive.`);
    setSelectedIds([]);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  return (
    <div
      className="flex flex-col w-full max-w-2xl lg:max-w-none mx-auto px-4 lg:px-8 pt-20 lg:pt-6 pb-36 lg:pb-16 gap-4 select-none"
      onClick={() => {
        setIsSortMenuOpen(false);
        setActiveMenuId(null);
      }}
    >
      {/* Universal Search & Filter Dock */}
      <section className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#e3e1ec] flex flex-col gap-3">
        {/* Universal Input Bar */}
        <div className="relative w-full flex items-center">
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#45474a]">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${items.length} ${items.length === 1 ? 'item' : 'items'} by name, Asset ID, brand, category...`}
            className="w-full h-11 pl-10 pr-20 bg-[#f4f2fd] rounded-xl text-[13px] text-[#1a1b22] placeholder:text-[#45474a]/60 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none transition-all"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('Amoxicillin');
              }}
              title="Voice Search"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#45474a] hover:text-[#1a1b22] hover:bg-[#e8e7f1] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">mic</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('camera');
              }}
              title="Camera Scanner"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0051d5] hover:bg-[#dbe1ff] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
            </button>
          </div>
        </div>

        {/* Category Filter Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCategory(cat.label);
                  onCategoryChange?.(cat.label);
                }}
                className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full font-mono text-[11px] transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-[#0051d5] text-white shadow-sm font-semibold'
                    : 'bg-[#eeedf7] text-[#1a1b22] hover:bg-[#e8e7f1]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] font-bold tabular-nums leading-none ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-[#f4f2fd] text-[#0051d5] border border-[#c6c6ca]/50'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Control Bar: View, Sort & Filter */}
        <div className="flex items-center justify-between pt-1 border-t border-[#eeedf7]">
          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSortMenuOpen(!isSortMenuOpen);
              }}
              className="flex items-center gap-1 text-[#1a1b22] text-[12px] font-medium hover:text-[#0051d5] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-[#45474a]">swap_vert</span>
              <span>
                {sortBy === 'recently_added' && 'Recently Added'}
                {sortBy === 'expiring_soon' && 'Expiring Soon'}
                {sortBy === 'highest_value' && 'Highest Value'}
              </span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {isSortMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-8 w-44 bg-white rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1 border border-[#e3e1ec]"
              >
                <button
                  onClick={() => {
                    setSortBy('recently_added');
                    setIsSortMenuOpen(false);
                  }}
                  className={`text-left px-3 py-1.5 rounded-lg text-[12px] flex items-center justify-between ${
                    sortBy === 'recently_added'
                      ? 'bg-[#f4f2fd] text-[#0051d5] font-semibold'
                      : 'hover:bg-[#eeedf7] text-[#1a1b22]'
                  }`}
                >
                  Recently Added
                  {sortBy === 'recently_added' && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSortBy('expiring_soon');
                    setIsSortMenuOpen(false);
                  }}
                  className={`text-left px-3 py-1.5 rounded-lg text-[12px] flex items-center justify-between ${
                    sortBy === 'expiring_soon'
                      ? 'bg-[#f4f2fd] text-[#0051d5] font-semibold'
                      : 'hover:bg-[#eeedf7] text-[#1a1b22]'
                  }`}
                >
                  Expiring Soon
                  {sortBy === 'expiring_soon' && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSortBy('highest_value');
                    setIsSortMenuOpen(false);
                  }}
                  className={`text-left px-3 py-1.5 rounded-lg text-[12px] flex items-center justify-between ${
                    sortBy === 'highest_value'
                      ? 'bg-[#f4f2fd] text-[#0051d5] font-semibold'
                      : 'hover:bg-[#eeedf7] text-[#1a1b22]'
                  }`}
                >
                  Highest Value
                  {sortBy === 'highest_value' && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#eeedf7] p-0.5 rounded-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('grid');
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#45474a]'
                }`}
                title="Card View"
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('table');
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#45474a]'
                }`}
                title="Dense Table View"
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
              </button>
            </div>

            {/* Filter Drawer Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterDrawerOpen(true);
              }}
              className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#eeedf7] hover:bg-[#e8e7f1] text-[#1a1b22] text-[11px] font-medium transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">filter_list</span>
              <span>Status: {statusFilter}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Summary Micro-Ribbon */}
      <div className="pt-1 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] text-[#45474a]">
          <span>INDEX REPOSITORY</span>
          <span className="w-1 h-1 rounded-full bg-[#45474a]/40" />
          <span className="text-[#1a1b22] font-semibold">
            {filteredItems.length} OBJECTS
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelectAll();
          }}
          className="font-mono text-[11px] text-[#0051d5] hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">select_all</span>
          <span>{selectedIds.length === filteredItems.length ? 'Deselect All' : 'Select Multiple'}</span>
        </button>
      </div>

      {/* Primary Catalog Results Container */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#e3e1ec] flex flex-col items-center justify-center text-center gap-3 py-12">
          <div className="w-14 h-14 rounded-2xl bg-[#f4f2fd] flex items-center justify-center text-[#0051d5]">
            <span className="material-symbols-outlined text-[30px]">inventory_2</span>
          </div>
          <div className="flex flex-col">
            <h4 className="font-semibold text-[15px] text-[#1a1b22]">Zero Assets Found</h4>
            <p className="text-[12px] text-[#45474a] max-w-xs mt-1 leading-snug">
              Your repository contains no items matching the filter. Scan a physical object with the optical reticle or import a document.
            </p>
          </div>
          <button
            onClick={() => onNavigate('camera')}
            className="mt-1 h-10 px-4 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-[12px] font-semibold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            <span>Launch AI Reticle Scanner</span>
          </button>
        </div>
      ) : (
        viewMode === 'table' ? (
          /* Master Inventory Table View */
          <div className="bg-white rounded-2xl shadow-sm border border-[#e3e1ec] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#f4f2fd] text-[#45474a] font-mono text-[11px] border-b border-[#e3e1ec]">
                    <th className="py-3 px-3 w-10 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">Asset ID</th>
                    <th className="py-3 px-3 min-w-[200px]">Product &amp; Brand</th>
                    <th className="py-3 px-3 min-w-[140px]">Category / Sub</th>
                    <th className="py-3 px-3 w-24">Quantity</th>
                    <th className="py-3 px-3 min-w-[115px] text-right">Price (₹ INR)</th>
                    <th className="py-3 px-3 w-28">Condition</th>
                    <th className="py-3 px-3 min-w-[155px]">Asset Dates</th>
                    <th className="py-3 px-3 min-w-[140px]">Manual Location</th>
                    <th className="py-3 px-3 min-w-[170px]">Geo Location (Photo)</th>
                    <th className="py-3 px-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeedf7]">
                  {filteredItems.map((item) => {
                    const isChecked = selectedIds.includes(item.id);
                    const isInspected = selectedDossierId === item.id;
                    const unifiedAssetId = resolveDisplayAssetId(item);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleRowOrCardSelect(item)}
                        className={`hover:bg-[#f8f7fd] transition-colors cursor-pointer group ${
                          isInspected
                            ? 'bg-[#f4f2fd] lg:shadow-[inset_3px_0_0_#0051d5]'
                            : isChecked
                            ? 'bg-[#f4f2fd]/60'
                            : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-2.5 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(item.id)}
                            className="w-4 h-4 rounded text-[#0051d5] accent-[#0051d5] cursor-pointer"
                          />
                        </td>

                        {/* Unified Asset ID */}
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-[#0051d5] tabular-nums whitespace-nowrap">
                          {unifiedAssetId}
                        </td>

                        {/* Product & Brand */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspectImage?.(item);
                              }}
                              title="Click to inspect full-screen image"
                              className="relative w-9 h-9 rounded-lg bg-[#eeedf7] overflow-hidden shrink-0 border border-[#c6c6ca]/40 group/img cursor-zoom-in"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/35 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-white text-[14px] opacity-0 group-hover/img:opacity-100">
                                  fullscreen
                                </span>
                              </div>
                            </button>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-[#1a1b22] truncate max-w-[220px]">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#45474a] font-mono truncate">
                                {item.brand ? (
                                  <span className="font-medium text-[#0051d5] truncate">
                                    {item.brand}
                                  </span>
                                ) : (
                                  <span className="text-[#45474a] truncate">
                                    {item.subCategory || resolveCanonicalCategoryName(item)}
                                  </span>
                                )}
                                {item.barcode && item.barcode !== 'N/A' && (
                                  <>
                                    <span>·</span>
                                    <span className="text-[10px] text-[#45474a]">
                                      Lot/EAN: {item.barcode}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Sub-category */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#1a1b22] truncate">{resolveCanonicalCategoryName(item)}</span>
                            <span className="text-[11px] text-[#45474a] truncate">
                              {item.subCategory || 'General'}
                            </span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#1a1b22] tabular-nums">
                          {item.quantity || '1 Unit'}
                        </td>

                        {/* Purchase Price */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-[12px] font-bold text-[#1a1b22] tabular-nums">
                              ₹{(item.value || 0).toLocaleString('en-IN')}
                            </span>
                            {item.priceSource && (
                              <span className="text-[9px] font-mono text-[#069669] truncate max-w-[110px]" title={item.priceSource}>
                                {item.priceSource}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Condition */}
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] font-mono text-[#1a1b22]">
                            {item.condition || 'New / Unopened'}
                          </span>
                        </td>

                        {/* Asset Dates: Purchase, Manufacturing & Expiry */}
                        <td className="py-2.5 px-3 font-mono text-[10px] tabular-nums">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[#1a1b22]">
                              <span className="text-[#45474a]">Pur:</span>{' '}
                              {item.purchaseDate || item.boughtDate || 'N/A'}
                            </span>
                            <span className="text-[#45474a]">
                              <span>Mfg:</span> {item.manufacturingDate || 'N/A'}
                            </span>
                            {item.expiresDate && item.expiresDate !== 'N/A' ? (
                              <span className="text-amber-800 font-semibold">
                                Exp: {item.expiresDate}
                              </span>
                            ) : (
                              <span className="text-[#45474a]">Exp: N/A</span>
                            )}
                          </div>
                        </td>

                        {/* Manual Location / Box */}
                        <td className="py-2.5 px-3 text-[11px] text-[#45474a]">
                          <div className="flex flex-col gap-0.5 max-w-[150px]">
                            <span className="truncate font-medium text-[#1a1b22]">
                              {item.location || 'Personal Vault'}
                            </span>
                            {item.boxNumber && item.boxNumber !== 'N/A' && (
                              <span className="font-mono text-[10px] text-[#45474a]">
                                {item.boxNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Captured Geo Location */}
                        <td className="py-2.5 px-3 text-[11px] text-[#45474a]">
                          {item.geoLocation ? (
                            <span
                              className="font-mono text-[10px] text-[#1a1b22] line-clamp-2 max-w-[200px]"
                              title={item.geoLocation}
                            >
                              {item.geoLocation}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-[#76777b]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-2.5 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              onSelectDossierItem(item);
                              onNavigate('dossier');
                            }}
                            title="Open Full Dossier View"
                            className="w-7 h-7 rounded-lg hover:bg-[#f4f2fd] text-[#45474a] hover:text-[#0051d5] flex items-center justify-center transition-colors mx-auto"
                          >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View (1-Col on Mobile, 2-Col on Desktop XL) */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const isChecked = selectedIds.includes(item.id);
              const isInspected = selectedDossierId === item.id;
              const unifiedAssetId = resolveDisplayAssetId(item);

              return (
                <article
                  key={item.id}
                  onClick={() => handleRowOrCardSelect(item)}
                  className={`relative bg-white rounded-2xl shadow-sm border hover:border-[#0051d5]/50 transition-all cursor-pointer flex flex-col p-3.5 gap-3 ${
                    isInspected
                      ? 'lg:border-[#0051d5] lg:ring-2 lg:ring-[#0051d5]/15 border-[#e3e1ec]'
                      : isChecked
                      ? 'ring-1 ring-[#0051d5]/40 bg-[#fbf8ff] border-[#e3e1ec]'
                      : 'border-[#e3e1ec]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Batch Checkbox */}
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="relative flex items-center cursor-pointer p-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectItem(item.id)}
                          className="w-4 h-4 rounded text-[#121417] accent-[#121417] cursor-pointer"
                        />
                      </label>

                      {/* Thumbnail */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectImage?.(item);
                        }}
                        title="Click to inspect full-screen image"
                        className="rounded-xl bg-[#f4f2fd] overflow-hidden shrink-0 relative border border-[#c6c6ca]/40 w-14 h-14 group/img cursor-zoom-in"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.imageAlt || item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-white text-[18px] opacity-0 group-hover/img:opacity-100">
                            fullscreen
                          </span>
                        </div>
                      </button>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#121417] text-white font-mono text-[10px] font-bold tracking-tight whitespace-nowrap">
                            {unifiedAssetId}
                          </span>
                          {item.brand && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#e8eaf6] text-[#0051d5] font-mono text-[10px] font-semibold">
                              {item.brand}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-full bg-[#f4f2fd] text-[#1a1b22] text-[11px] font-medium">
                            {resolveCanonicalCategoryName(item)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-[14px] text-[#1a1b22] truncate mt-1">
                          {item.name}
                        </h3>
                        <p className="text-[12px] text-[#45474a] truncate">
                          {item.subCategory || item.subname}
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Trigger */}
                    <div className="relative">
                      <button
                        aria-label="Record options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === item.id ? null : item.id);
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#45474a] hover:text-[#1a1b22] hover:bg-[#eeedf7] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>

                      {activeMenuId === item.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-xl py-1 z-30 border border-[#e3e1ec]"
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onSelectDossierItem(item);
                              onNavigate('dossier');
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-[#f4f2fd] text-[12px] text-[#1a1b22] flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            Edit Dossier
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDuplicateItem(item);
                              setFeedbackToast(`Duplicated ${item.name}`);
                              setTimeout(() => setFeedbackToast(null), 2500);
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-[#f4f2fd] text-[12px] text-[#1a1b22] flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[15px]">content_copy</span>
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onArchiveItems([item.id]);
                              setFeedbackToast(`Moved "${item.name}" to archive.`);
                              setTimeout(() => setFeedbackToast(null), 2500);
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-[#ffdad6]/40 text-[12px] text-[#ba1a1a] flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[15px]">archive</span>
                            Archive
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description preview if present */}
                  {item.description && (
                    <p className="text-[12px] text-[#45474a] line-clamp-2 bg-[#f8f7fd] p-2 rounded-lg border border-[#e3e1ec]/40 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Specification Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f4f2fd]/60 p-2.5 rounded-xl font-mono text-[11px] border border-[#e3e1ec]/40">
                    <div className="flex flex-col">
                      <span className="text-[#45474a] text-[10px]">PRICE</span>
                      <span className="font-semibold text-[#1a1b22] tabular-nums text-[12px]">
                        ₹{(item.value || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#45474a] text-[10px]">QUANTITY</span>
                      <span className="text-[#1a1b22] font-medium truncate">
                        {item.quantity || '1 Unit'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#45474a] text-[10px]">CONDITION</span>
                      <span className="text-[#1a1b22] font-medium truncate">
                        {item.condition || 'New / Unopened'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#45474a] text-[10px]">MANUAL LOCATION</span>
                      <span className="text-[#1a1b22] font-medium truncate">
                        {item.location || item.boxNumber || 'Personal Vault'}
                      </span>
                    </div>
                  </div>

                  {/* 3-Date Lifecycle Strip: Purchase, Manufacturing, Expiry */}
                  <div className="grid grid-cols-3 gap-2 bg-[#f4f2fd]/40 px-2.5 py-2 rounded-xl font-mono text-[10px] border border-[#e3e1ec]/40 tabular-nums">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#45474a] text-[9px] truncate">PURCHASE DATE</span>
                      <span className="text-[#1a1b22] font-semibold truncate">
                        {item.purchaseDate || item.boughtDate || 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#45474a] text-[9px] truncate">MFG DATE</span>
                      <span className="text-[#1a1b22] font-medium truncate">
                        {item.manufacturingDate || 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#45474a] text-[9px] truncate">EXPIRY DATE</span>
                      <span
                        className={`truncate ${
                          item.expiresDate && item.expiresDate !== 'N/A'
                            ? 'text-amber-800 font-semibold'
                            : 'text-[#45474a]'
                        }`}
                      >
                        {item.expiresDate || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Captured Geo Location line if available */}
                  {item.geoLocation && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#45474a] font-mono pt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-[#0051d5] shrink-0">
                        location_on
                      </span>
                      <span className="text-[#1a1b22] font-medium">Geo:</span>
                      <span className="truncate">{item.geoLocation}</span>
                    </div>
                  )}

                  {/* Notes / Advisory Footer */}
                  {item.notes && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#069669] font-medium pt-0.5">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      <span className="truncate">{item.notes}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      )}

      {/* Batch Action Sticky Bottom Tray */}
      {selectedIds.length > 0 && (
        <aside className="fixed bottom-18 left-0 right-0 z-40 px-4 pointer-events-none animate-in slide-in-from-bottom duration-200">
          <div className="max-w-md mx-auto bg-[#121417] text-white rounded-2xl shadow-2xl px-4 py-2.5 flex items-center justify-between pointer-events-auto border border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0051d5] text-white font-mono text-[11px] font-bold">
                {selectedIds.length}
              </span>
              <span className="text-[12px] font-medium tracking-tight">
                {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSelected}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-medium active:scale-95 transition-all"
                title="Export selection as JSON"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                <span>Export</span>
              </button>
              <button
                onClick={handleArchiveBatch}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 text-white text-[12px] font-medium active:scale-95 transition-all"
                title="Move selection to archive"
              >
                <span className="material-symbols-outlined text-[15px]">archive</span>
                <span>Archive</span>
              </button>
              <button
                aria-label="Clear batch selection"
                onClick={() => setSelectedIds([])}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Status / Storage Filter Bottom Sheet */}
      {isFilterDrawerOpen && (
        <div
          onClick={() => setIsFilterDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 border-t border-[#e3e1ec]"
          >
            <div className="flex items-center justify-between pb-1 border-b border-[#eeedf7]">
              <div className="flex flex-col">
                <span className="font-semibold text-[16px] text-[#1a1b22]">Filter By State</span>
                <span className="font-mono text-[10px] text-[#45474a] uppercase">
                  PHYSICAL &amp; ARCHIVAL CONDITION
                </span>
              </div>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[#eeedf7] text-[#1a1b22]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 font-medium text-[13px]">
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#f4f2fd] cursor-pointer">
                <span className="flex items-center gap-2 text-[#1a1b22]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active &amp; In-Use
                </span>
                <input
                  type="radio"
                  name="statusFilter"
                  checked={statusFilter === 'Active'}
                  onChange={() => setStatusFilter('Active')}
                  className="accent-[#121417]"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f4f2fd] cursor-pointer">
                <span className="flex items-center gap-2 text-[#1a1b22]">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> In Secure Storage
                </span>
                <input
                  type="radio"
                  name="statusFilter"
                  checked={statusFilter === 'In Storage'}
                  onChange={() => setStatusFilter('In Storage')}
                  className="accent-[#121417]"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f4f2fd] cursor-pointer">
                <span className="flex items-center gap-2 text-[#1a1b22]">
                  <span className="w-2 h-2 rounded-full bg-[#76777b]" /> Decommissioned / Archive
                </span>
                <input
                  type="radio"
                  name="statusFilter"
                  checked={statusFilter === 'Archived'}
                  onChange={() => setStatusFilter('Archived')}
                  className="accent-[#121417]"
                />
              </label>
            </div>

            <button
              onClick={() => setIsFilterDrawerOpen(false)}
              className="h-11 bg-[#121417] text-white rounded-xl font-semibold text-[14px] flex items-center justify-center active:scale-95 transition-all shadow-md mt-1"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-24 inset-x-4 max-w-sm mx-auto bg-[#121417] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 border border-white/10 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[18px] text-[#069669]">check_circle</span>
          <span className="text-[12px] font-medium">{feedbackToast}</span>
        </div>
      )}
    </div>
  );
};
