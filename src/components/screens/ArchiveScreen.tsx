import React, { useState } from 'react';
import { ArchiveItem, ScreenType } from '../../types/inventory';
import { HistoricalDossierModal } from '../modals/HistoricalDossierModal';

interface ArchiveScreenProps {
  archiveItems: ArchiveItem[];
  onRestoreItem: (item: ArchiveItem) => void;
  onPurgeItem: (itemId: string) => void;
  onPurgeAll: () => void;
  onNavigate: (screen: ScreenType) => void;
  onInspectImage?: (item: ArchiveItem) => void;
}

export const ArchiveScreen: React.FC<ArchiveScreenProps> = ({
  archiveItems,
  onRestoreItem,
  onPurgeItem,
  onPurgeAll,
  onInspectImage,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'consumed' | 'sold' | 'discarded'>('all');
  const [selectedHistoricalItem, setSelectedHistoricalItem] = useState<ArchiveItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredItems = archiveItems.filter((item) => {
    if (activeFilter === 'consumed') return item.statusBadge === 'Expired';
    if (activeFilter === 'sold') return item.statusBadge === 'Sold';
    if (activeFilter === 'discarded') return item.statusBadge === 'Donated' || item.statusBadge === 'Discarded';
    return true;
  });

  const handleExportPDF = () => {
    setToastMessage('Generating and downloading Insurance Dossier (PDF)...');
    setTimeout(() => {
      // Simulate real download
      const element = document.createElement('a');
      const file = new Blob([`OmniVault Insurance Dossier v2.4\nTotal Items: ${archiveItems.length}\nGenerated: ${new Date().toISOString()}`], {
        type: 'application/pdf',
      });
      element.href = URL.createObjectURL(file);
      element.download = `OmniVault_Insurance_Dossier_${Date.now()}.pdf`;
      element.click();
      setToastMessage('Insurance Dossier (PDF) exported successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    }, 1000);
  };

  const handleExportBackup = () => {
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(archiveItems, null, 2))}`;
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', jsonStr);
    dlAnchor.setAttribute('download', `omnivault_archive_backup_${Date.now()}.json`);
    dlAnchor.click();

    setToastMessage(`Exported ${archiveItems.length} records as JSON Backup.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmPurgeAll = () => {
    if (window.confirm('WARNING: Are you sure you want to permanently empty the entire archive? This cannot be undone.')) {
      onPurgeAll();
      setToastMessage('Vault archive purged completely.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl lg:max-w-none mx-auto px-4 lg:px-8 pt-20 lg:pt-6 pb-28 lg:pb-12 gap-4 select-none">
      {/* Title & Introduction Header */}
      <section className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#0051d5] text-[18px]">inventory_2</span>
          <span className="font-mono text-[10px] text-[#0051d5] uppercase tracking-widest font-semibold">
            Archive Registry
          </span>
        </div>
        <h2 className="font-bold text-[22px] text-[#1a1b22] tracking-tight leading-tight">
          Vault Archive &amp; Decommissioned Records
        </h2>
        <p className="text-[13px] text-[#45474a] leading-relaxed">
          Soft-deleted and decommissioned assets are preserved for warranty, insurance, and historical reference before permanent deletion.
        </p>
      </section>

      {/* Metrics Card */}
      <section className="bg-[#f4f2fd] rounded-2xl p-4 shadow-sm border border-[#e3e1ec]">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center justify-center p-2">
            <span className="font-mono text-[10px] text-[#45474a] uppercase tracking-wider mb-1">
              Archived Items
            </span>
            <span className="font-mono text-[18px] text-[#1a1b22] font-bold tabular-nums">
              {archiveItems.length}
            </span>
            <span className="font-mono text-[10px] text-[#069669] mt-0.5 flex items-center gap-0.5 font-semibold">
              <span className="material-symbols-outlined text-[13px]">verified</span>Preserved
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 bg-[#eeedf7]/70 rounded-xl">
            <span className="font-mono text-[10px] text-[#45474a] uppercase tracking-wider mb-1">
              Recoverable Value
            </span>
            <span className="font-mono text-[17px] text-[#0051d5] font-bold tabular-nums">
              ₹{Math.round(archiveItems.reduce((acc, curr) => acc + (curr.purchaseValue || 0), 0)).toLocaleString('en-IN')}
            </span>
            <span className="font-mono text-[10px] text-[#45474a] mt-0.5 font-medium">Appraised INR</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2">
            <span className="font-mono text-[10px] text-[#45474a] uppercase tracking-wider mb-1">
              Cloud Backup
            </span>
            <span className="font-mono text-[14px] text-[#1a1b22] font-bold mt-1">Synchronized</span>
            <span className="font-mono text-[10px] text-[#069669] mt-0.5 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#069669] animate-pulse" />Active
            </span>
          </div>
        </div>
      </section>

      {/* Filter Tabs Horizontal Scroller */}
      <section className="overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-[#121417] text-white shadow-sm'
                : 'bg-[#eeedf7] text-[#45474a] hover:bg-[#e8e7f1]'
            }`}
          >
            <span>All Archived</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded-full font-mono text-[10px]">
              {archiveItems.length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('consumed')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
              activeFilter === 'consumed'
                ? 'bg-[#121417] text-white shadow-sm'
                : 'bg-[#eeedf7] text-[#45474a] hover:bg-[#e8e7f1]'
            }`}
          >
            <span>Consumed / Expired</span>
            <span className="px-1.5 py-0.2 bg-[#e3e1ec] rounded-full font-mono text-[10px]">
              {archiveItems.filter((i) => i.statusBadge === 'Expired').length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('sold')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
              activeFilter === 'sold'
                ? 'bg-[#121417] text-white shadow-sm'
                : 'bg-[#eeedf7] text-[#45474a] hover:bg-[#e8e7f1]'
            }`}
          >
            <span>Sold / Transferred</span>
            <span className="px-1.5 py-0.2 bg-[#e3e1ec] rounded-full font-mono text-[10px]">
              {archiveItems.filter((i) => i.statusBadge === 'Sold').length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('discarded')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
              activeFilter === 'discarded'
                ? 'bg-[#121417] text-white shadow-sm'
                : 'bg-[#eeedf7] text-[#45474a] hover:bg-[#e8e7f1]'
            }`}
          >
            <span>Discarded / Recycled</span>
            <span className="px-1.5 py-0.2 bg-[#e3e1ec] rounded-full font-mono text-[10px]">
              {archiveItems.filter((i) => i.statusBadge === 'Donated' || i.statusBadge === 'Discarded').length}
            </span>
          </button>
        </div>
      </section>

      {/* Archive Item Cards */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
        {filteredItems.length === 0 ? (
          <div className="xl:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-[#e3e1ec] flex flex-col items-center justify-center text-center gap-2.5 py-10">
            <div className="w-12 h-12 rounded-2xl bg-[#eeedf7] flex items-center justify-center text-[#45474a]">
              <span className="material-symbols-outlined text-[26px]">archive</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[14px] text-[#1a1b22]">Archive Registry Empty</span>
              <span className="text-[12px] text-[#45474a] max-w-xs mt-0.5">
                Zero decommissioned or soft-deleted records. Soft-deleted items from your active inventory are preserved here.
              </span>
            </div>
          </div>
        ) : (
          filteredItems.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3 transition-all relative overflow-hidden border border-[#e3e1ec]"
            >
              <div className="flex items-start gap-3.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectImage?.(record);
                  }}
                  title="Click to inspect full-screen image"
                  className="w-16 h-16 rounded-xl bg-[#eeedf7] shrink-0 overflow-hidden relative border border-[#c6c6ca]/40 group cursor-zoom-in"
                >
                  <img
                    src={record.imageUrl}
                    alt={record.imageAlt || record.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-white text-[18px] opacity-0 group-hover:opacity-100">
                      fullscreen
                    </span>
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] bg-[#eeedf7] px-1.5 py-0.5 rounded text-[#45474a] font-medium">
                      {record.code}
                    </span>
                    {record.statusBadge === 'Expired' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] font-mono text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />
                        Expired
                      </span>
                    ) : record.statusBadge === 'Sold' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dbe1ff] text-[#00174b] font-mono text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0051d5]" />
                        {record.statusBadgeText}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#eeedf7] text-[#45474a] font-mono text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#76777b]" />
                        {record.statusBadgeText}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-[14px] text-[#1a1b22] truncate mt-1">
                    {record.name}
                  </h3>
                  <p className="text-[12px] text-[#45474a] mt-0.5 truncate">
                    {record.archivedReason}
                  </p>
                </div>
              </div>

              <div className="bg-[#f4f2fd] rounded-xl p-2.5 flex flex-col gap-1 text-[12px] border border-[#e3e1ec]/40 font-mono">
                <div className="flex justify-between items-center text-[#45474a]">
                  <span className="text-[10px] uppercase font-semibold">
                    {record.secondaryLabel}
                  </span>
                  <span className="text-[#1a1b22] font-medium">{record.secondaryValue}</span>
                </div>
                <div className="flex justify-between items-center text-[#45474a]">
                  <span className="text-[10px] uppercase font-semibold">
                    {record.statusBadge === 'Sold' ? 'PURCHASED DATE' : 'PURCHASE VALUATION'}
                  </span>
                  <span className="text-[#1a1b22] font-semibold">
                    {record.statusBadge === 'Sold'
                      ? record.purchaseDate
                      : `₹${record.purchaseValue.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => {
                    onRestoreItem(record);
                    setToastMessage(`Restored "${record.name}" to active inventory.`);
                    setTimeout(() => setToastMessage(null), 2800);
                  }}
                  className="flex-1 h-9 rounded-xl bg-[#eeedf7] hover:bg-[#e8e7f1] text-[#1a1b22] text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">unarchive</span>
                  Restore to Active
                </button>

                {record.historicalDetails ? (
                  <button
                    onClick={() => setSelectedHistoricalItem(record)}
                    className="flex-1 h-9 rounded-xl bg-[#121417] hover:bg-[#1a1c1f] text-white text-[12px] font-medium flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">history_edu</span>
                    Historical Dossier
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (window.confirm(`Permanently purge "${record.name}" from archive?`)) {
                        onPurgeItem(record.id);
                        setToastMessage('Record purged permanently.');
                        setTimeout(() => setToastMessage(null), 2500);
                      }
                    }}
                    title="Purge Record"
                    className="h-9 px-3 rounded-xl bg-[#ffdad6] hover:bg-[#ffdad6]/80 text-[#93000a] text-[12px] font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    <span>Purge</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Vault Archive Utilities */}
      <section className="bg-white rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm border border-[#e3e1ec]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#45474a] text-[20px]">admin_panel_settings</span>
          <h4 className="font-semibold text-[15px] text-[#1a1b22]">Vault Archive Utilities</h4>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleExportPDF}
            className="w-full h-11 rounded-xl bg-[#f4f2fd] hover:bg-[#eeedf7] text-[#1a1b22] text-[13px] font-medium px-4 flex items-center justify-between border border-[#e3e1ec]/60 transition-all active:scale-95"
          >
            <span className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#0051d5] text-[20px]">picture_as_pdf</span>
              Export Insurance Dossier (PDF)
            </span>
            <span className="font-mono text-[11px] text-[#45474a]">v2.4 Ready</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="w-full h-11 rounded-xl bg-[#f4f2fd] hover:bg-[#eeedf7] text-[#1a1b22] text-[13px] font-medium px-4 flex items-center justify-between border border-[#e3e1ec]/60 transition-all active:scale-95"
          >
            <span className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#45474a] text-[20px]">file_download</span>
              Export Full JSON / CSV Backup
            </span>
            <span className="font-mono text-[11px] text-[#45474a]">{archiveItems.length} records</span>
          </button>

          <button
            onClick={handleConfirmPurgeAll}
            className="w-full h-11 rounded-xl bg-[#ffdad6]/70 hover:bg-[#ffdad6] text-[#93000a] text-[13px] font-semibold px-4 flex items-center justify-between transition-all active:scale-95 mt-0.5"
          >
            <span className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
              Empty Archive (Purge All)
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider">Irreversible</span>
          </button>
        </div>

        <div className="p-2.5 bg-[#f4f2fd] rounded-xl flex items-center gap-2 text-[#45474a] border border-[#e3e1ec]/50">
          <span className="material-symbols-outlined text-[16px] text-[#0051d5] shrink-0">info</span>
          <span className="font-mono text-[11px] leading-tight">
            Purged items are scrubbed from AES-256 cloud shards within 30 days.
          </span>
        </div>
      </section>

      {/* Historical Dossier Modal */}
      {selectedHistoricalItem && (
        <HistoricalDossierModal
          item={selectedHistoricalItem}
          onClose={() => setSelectedHistoricalItem(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 inset-x-4 max-w-sm mx-auto bg-[#121417] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 border border-white/10 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[18px] text-[#85f8c4]">check_circle</span>
          <span className="text-[12px] font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
