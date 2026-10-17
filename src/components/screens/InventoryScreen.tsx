import React, { useState, useMemo } from 'react';
import { InventoryItem, ScreenType } from '../../types/inventory';

interface InventoryScreenProps {
  items: InventoryItem[];
  onSelectDossierItem: (item: InventoryItem) => void;
  onNavigate: (screen: ScreenType) => void;
  onArchiveItems: (itemIds: string[]) => void;
  onDuplicateItem: (item: InventoryItem) => void;
  initialCategoryFilter?: string | null;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  items,
  onSelectDossierItem,
  onNavigate,
  onArchiveItems,
  onDuplicateItem,
  initialCategoryFilter = 'All',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryFilter || 'All');
  const [sortBy, setSortBy] = useState<'recently_added' | 'expiring_soon' | 'highest_value'>('recently_added');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Active' | 'In Storage' | 'Archived'>('Active');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Dynamically compute real categories and item counts directly from vault items
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};

    items.forEach((item) => {
      const cat = item.category?.trim() || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // Baseline catalog categories in OmniVault
    const baseline = [
      'Medicine',
      'Health & Wellness',
      'Home Appliances',
      'Electronics',
      'Apparel',
      'Furniture',
      'Vehicles',
      'Documents',
    ];

    const result: { label: string; count: number }[] = [
      { label: 'All', count: items.length },
    ];

    // First add all categories that currently exist in the user's inventory
    Object.keys(counts).forEach((cat) => {
      result.push({
        label: cat,
        count: counts[cat],
      });
    });

    // Then add any baseline categories not yet in the list with count 0
    baseline.forEach((base) => {
      if (!counts[base] && !result.some((r) => r.label.toLowerCase() === base.toLowerCase())) {
        result.push({
          label: base,
          count: 0,
        });
      }
    });

    return result;
  }, [items]);

  // Filtering and sorting
  const filteredItems = useMemo(() => {
    let list = [...items];

    // Category filter
    if (selectedCategory !== 'All') {
      list = list.filter((item) =>
        item.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.subname.toLowerCase().includes(q) ||
          (item.location && item.location.toLowerCase().includes(q))
      );
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
      className="flex flex-col w-full max-w-2xl mx-auto px-4 pt-20 pb-36 gap-3 select-none"
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
            placeholder={`Search ${items.length} ${items.length === 1 ? 'item' : 'items'} by name, serial, category...`}
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
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCategory(cat.label);
              }}
              className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full font-mono text-[11px] transition-all active:scale-95 ${
                selectedCategory === cat.label
                  ? 'bg-[#121417] text-white shadow-sm'
                  : 'bg-[#eeedf7] text-[#45474a] hover:bg-[#e8e7f1] hover:text-[#1a1b22]'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                  selectedCategory === cat.label
                    ? 'bg-white/20 text-white'
                    : 'bg-[#e3e1ec] text-[#1a1b22]'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
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
                    <th className="py-3 px-2 w-14">S.No</th>
                    <th className="py-3 px-3 min-w-[200px]">Product &amp; Brand</th>
                    <th className="py-3 px-3 min-w-[150px]">Category / Sub-category</th>
                    <th className="py-3 px-3 w-24">Quantity</th>
                    <th className="py-3 px-3 min-w-[120px] text-right">Price (₹ INR)</th>
                    <th className="py-3 px-3 w-28">Condition</th>
                    <th className="py-3 px-3 w-28">Expiry / Date</th>
                    <th className="py-3 px-3 w-32">Location / Box</th>
                    <th className="py-3 px-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeedf7]">
                  {filteredItems.map((item, idx) => {
                    const isChecked = selectedIds.includes(item.id);
                    const displaySerial = item.serialNumber || String(idx + 1);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          onSelectDossierItem(item);
                          onNavigate('dossier');
                        }}
                        className={`hover:bg-[#f8f7fd] transition-colors cursor-pointer group ${
                          isChecked ? 'bg-[#f4f2fd]/60' : ''
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

                        {/* S.No */}
                        <td className="py-2.5 px-2 font-mono text-[11px] font-bold text-[#45474a]">
                          {displaySerial}
                        </td>

                        {/* Product & Brand */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-[#eeedf7] overflow-hidden shrink-0 border border-[#c6c6ca]/40">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-[#1a1b22] truncate max-w-[220px]">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#45474a] font-mono">
                                {item.brand && <span className="font-medium text-[#0051d5]">{item.brand}</span>}
                                {item.brand && <span>•</span>}
                                <span>{item.code}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Sub-category */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#1a1b22] truncate">{item.category}</span>
                            <span className="text-[11px] text-[#45474a] truncate">
                              {item.subCategory || 'General'}
                            </span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#1a1b22]">
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#f4f2fd] text-[#1a1b22] border border-[#e3e1ec]">
                            {item.condition || 'New / Unopened'}
                          </span>
                        </td>

                        {/* Expiry / Date */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#45474a]">
                          {item.expiresDate && item.expiresDate !== 'N/A' ? (
                            <span className="text-amber-800 font-semibold">{item.expiresDate}</span>
                          ) : (
                            item.boughtDate || item.purchaseDate || 'N/A'
                          )}
                        </td>

                        {/* Location / Box */}
                        <td className="py-2.5 px-3 text-[11px] text-[#45474a]">
                          <div className="flex flex-col">
                            <span className="truncate">{item.location || 'Personal Vault'}</span>
                            {item.boxNumber && item.boxNumber !== 'N/A' && (
                              <span className="font-mono text-[10px] text-[#0051d5] font-medium">
                                {item.boxNumber}
                              </span>
                            )}
                          </div>
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
                            title="Inspect & Edit Dossier"
                            className="w-7 h-7 rounded-lg hover:bg-[#f4f2fd] text-[#45474a] hover:text-[#0051d5] flex items-center justify-center transition-colors mx-auto"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
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
          /* Card View */
          <div className="flex flex-col gap-3.5">
            {filteredItems.map((item, idx) => {
              const isChecked = selectedIds.includes(item.id);
              const displaySerial = item.serialNumber || String(idx + 1);

              return (
                <article
                  key={item.id}
                  onClick={() => {
                    onSelectDossierItem(item);
                    onNavigate('dossier');
                  }}
                  className={`relative bg-white rounded-2xl shadow-sm border border-[#e3e1ec] hover:border-[#0051d5]/50 transition-all cursor-pointer flex flex-col p-3.5 gap-3 ${
                    isChecked ? 'ring-1 ring-[#0051d5]/40 bg-[#fbf8ff]' : ''
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
                      <div className="rounded-xl bg-[#f4f2fd] overflow-hidden shrink-0 relative border border-[#c6c6ca]/40 w-14 h-14">
                        <img
                          src={item.imageUrl}
                          alt={item.imageAlt || item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-md bg-[#121417] text-white font-mono text-[10px] font-bold">
                            #{displaySerial}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-[#eeedf7] text-[#45474a] font-mono text-[10px] font-medium">
                            {item.code}
                          </span>
                          {item.brand && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#e8eaf6] text-[#0051d5] font-mono text-[10px] font-semibold">
                              {item.brand}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-full bg-[#f4f2fd] text-[#1a1b22] text-[11px] font-medium">
                            {item.category}
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
                      <span className="text-[#45474a] text-[10px]">LOCATION</span>
                      <span className="text-[#1a1b22] font-medium truncate">
                        {item.location || item.boxNumber || 'Personal Vault'}
                      </span>
                    </div>
                  </div>

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
