import React, { useState } from 'react';
import { InventoryItem, SystemAlert, CategoryOverview, ScreenType } from '../../types/inventory';

interface DashboardScreenProps {
  inventoryItems: InventoryItem[];
  recentScans: InventoryItem[];
  systemAlerts: SystemAlert[];
  categories: CategoryOverview[];
  onNavigate: (screen: ScreenType) => void;
  onSelectCategoryFilter: (categoryName: string) => void;
  onSelectDossierItem: (item: InventoryItem) => void;
  onSyncLedger: () => void;
  isSyncing: boolean;
  lastSyncedText: string;
  isRealUser?: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  inventoryItems,
  recentScans,
  systemAlerts,
  categories,
  onNavigate,
  onSelectCategoryFilter,
  onSelectDossierItem,
  onSyncLedger,
  isSyncing,
  lastSyncedText,
  isRealUser = false,
}) => {
  const [shutterHintText, setShutterHintText] = useState('Quick Ingest Reticle');

  // Compute live valuation and count (if real user, show their exact real data)
  const totalCount = isRealUser ? inventoryItems.length : 1482 + (inventoryItems.length - 6);
  const totalRawValuation = inventoryItems.reduce((acc, curr) => acc + (curr.value || 0), 0);

  // Format Indian Rupee valuation convention
  const formatInrValuation = (val: number): string => {
    if (val === 0) return '₹0';
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)}Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(1)}k`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const displayValuation = isRealUser
    ? formatInrValuation(totalRawValuation)
    : formatInrValuation(482000 + (totalRawValuation - 395840));

  const newBadgeText = isRealUser
    ? (inventoryItems.length > 0 ? `+${inventoryItems.length} active` : '0 new')
    : `+${14 + Math.max(0, inventoryItems.length - 6)} new`;

  const handleFloatingShutterClick = () => {
    setShutterHintText('Activating Optical Reticle...');
    setTimeout(() => {
      onNavigate('camera');
    }, 250);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 pt-20 pb-28 gap-5">
      {/* Top Key Metrics Dashboard Module */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-[#e3e1ec] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0051d5]" />
            <span className="font-mono text-[11px] font-semibold text-[#45474a] uppercase tracking-wider">
              Vault Index Ledger
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#45474a] bg-[#eeedf7] px-2 py-0.5 rounded font-medium">
            v4.19
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Metric 1: Total Cataloged */}
          <div className="bg-[#f4f2fd] p-3.5 rounded-xl flex flex-col justify-between border border-[#e3e1ec]/50">
            <span className="text-[12px] font-medium text-[#45474a]">Total Cataloged</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="font-semibold text-[28px] text-[#1a1b22] tracking-tight leading-none tabular-nums">
                {totalCount.toLocaleString('en-IN')}
              </span>
              <span className="font-mono text-[11px] text-[#069669] font-semibold">
                {newBadgeText}
              </span>
            </div>
          </div>

          {/* Metric 2: Estimated Valuation */}
          <div className="bg-[#f4f2fd] p-3.5 rounded-xl flex flex-col justify-between border border-[#e3e1ec]/50">
            <span className="text-[12px] font-medium text-[#45474a]">Est. Valuation</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="font-semibold text-[28px] text-[#1a1b22] tracking-tight leading-none tabular-nums">
                {displayValuation}
              </span>
              <span className="font-mono text-[11px] text-[#45474a]">INR</span>
            </div>
          </div>
        </div>

        {/* Live Sync Telemetry Strip */}
        <div className="bg-[#e8e7f1]/60 px-3.5 py-2.5 rounded-xl flex items-center justify-between border border-[#e3e1ec]/60">
          <div className="flex items-center gap-2.5">
            <span className={`material-symbols-outlined text-[19px] text-[#0051d5] ${isSyncing ? 'animate-spin' : ''}`}>
              cloud_done
            </span>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold text-[#1a1b22] leading-tight">
                Encrypted Local &amp; Cloud
              </span>
              <span className="font-mono text-[11px] text-[#45474a]">
                SHA-256 Validated • {isSyncing ? 'Syncing now...' : lastSyncedText}
              </span>
            </div>
          </div>
          <button
            onClick={onSyncLedger}
            disabled={isSyncing}
            className="bg-white px-3 py-1 rounded-lg text-[#1a1b22] font-mono text-[11px] font-semibold hover:bg-[#eeedf7] active:scale-95 transition-all shadow-sm border border-[#c6c6ca]/40"
          >
            {isSyncing ? 'SYNCING' : 'SYNC'}
          </button>
        </div>
      </section>

      {/* Expiration & Maintenance Alert Dossier */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-[#e3e1ec] flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">notification_important</span>
            <span className="font-semibold text-[16px] text-[#1a1b22] tracking-tight">System Alerts</span>
          </div>
          <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            systemAlerts.length > 0 ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-emerald-50 text-emerald-800'
          }`}>
            {systemAlerts.length > 0 ? `${systemAlerts.length} Items Requiring Review` : 'All Systems Clear'}
          </span>
        </div>

        {/* Critical Batch Alert Items or Clean Real State */}
        {systemAlerts.length === 0 ? (
          <div className="p-3 bg-[#f4f2fd]/60 rounded-xl text-center text-[12px] text-[#45474a] font-mono flex items-center justify-center gap-2 border border-[#e3e1ec]/40">
            <span className="material-symbols-outlined text-[16px] text-[#069669]">check_circle</span>
            <span>Zero critical alerts. All cataloged belongings are within normal parameters.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  const target = inventoryItems.find((i) => i.category.toLowerCase().includes(alert.category.toLowerCase())) || inventoryItems[0];
                  if (target) {
                    onSelectDossierItem(target);
                    onNavigate('dossier');
                  }
                }}
                className="bg-[#f4f2fd] p-3 rounded-xl flex items-start justify-between gap-3 border border-[#e3e1ec]/40 hover:border-[#0051d5]/40 hover:bg-[#eeedf7]/70 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#e3e1ec] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">{alert.icon}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[14px] text-[#1a1b22] truncate">
                        {alert.title}
                      </span>
                      <span className="bg-amber-100 text-amber-900 font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold">
                        {alert.badgeText}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#45474a] mt-0.5">{alert.subtitle}</span>
                  </div>
                </div>
                <button
                  aria-label="Review Alert"
                  className="bg-[#e3e1ec] group-hover:bg-[#0051d5] group-hover:text-white text-[#1a1b22] p-1.5 rounded-lg shrink-0 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] block">arrow_forward</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Taxonomy Matrix */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[16px] text-[#1a1b22] tracking-tight">Categories</span>
          <button
            onClick={() => onNavigate('inventory')}
            className="font-mono text-[11px] font-semibold text-[#0051d5] hover:underline flex items-center gap-1"
          >
            VIEW ALL ({categories.length})
            <span className="material-symbols-outlined text-[14px]">north_east</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                onSelectCategoryFilter(cat.name);
                onNavigate('inventory');
              }}
              className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#e3e1ec] hover:border-[#0051d5]/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-24 group"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#eeedf7] flex items-center justify-center group-hover:bg-[#dbe1ff] transition-colors">
                  <span className="material-symbols-outlined text-[18px] text-[#0051d5]">{cat.icon}</span>
                </span>
                <span className="font-mono text-[13px] font-bold text-[#1a1b22] tabular-nums">
                  {cat.count}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[13px] text-[#1a1b22] leading-tight truncate">
                  {cat.name}
                </span>
                <span className="font-mono text-[10px] text-[#45474a] mt-0.5 truncate">
                  {cat.flaggedText}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Scans & Ingestions Module */}
      <section className="flex flex-col gap-3 mt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[19px] text-[#45474a]">history</span>
            <span className="font-semibold text-[16px] text-[#1a1b22] tracking-tight">
              Recent Scans &amp; Ingestions
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-wider text-[#45474a] uppercase bg-[#eeedf7] px-2 py-0.5 rounded font-medium">
            LIVE QUEUE
          </span>
        </div>

        {recentScans.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e3e1ec] flex flex-col items-center justify-center text-center gap-2.5 py-8">
            <div className="w-12 h-12 rounded-2xl bg-[#eeedf7] flex items-center justify-center text-[#0051d5]">
              <span className="material-symbols-outlined text-[26px]">photo_camera</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[14px] text-[#1a1b22]">Clean Vault Initialized</span>
              <span className="text-[12px] text-[#45474a] max-w-xs mt-0.5">
                Zero dummy data. Point the AI Reticle Scanner at physical objects or barcodes to begin indexing.
              </span>
            </div>
            <button
              onClick={() => onNavigate('camera')}
              className="mt-1 h-9 px-4 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">center_focus_strong</span>
              <span>Scan First Physical Object</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentScans.map((item) => (
              <article
                key={item.id}
                onClick={() => {
                  onSelectDossierItem(item);
                  onNavigate('dossier');
                }}
                className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#e3e1ec] flex flex-col gap-3 hover:border-[#0051d5]/40 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-[#eeedf7] overflow-hidden shrink-0 border border-[#c6c6ca]/40">
                    <img
                      src={item.imageUrl}
                      alt={item.imageAlt || item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-semibold text-[14px] text-[#1a1b22] truncate">
                        {item.name}
                      </h3>
                      <span className="font-mono text-[13px] font-bold text-[#1a1b22] shrink-0 tabular-nums">
                        ₹{(item.value || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#45474a] mt-0.5 truncate">
                      {item.subname}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="bg-[#eeedf7] px-1.5 py-0.5 rounded font-mono text-[10px] text-[#45474a] font-medium">
                        {item.code}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 font-mono text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        {item.statusLabel || 'Verified Ingest'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#f4f2fd] px-3 py-1.5 rounded-lg flex items-center justify-between font-mono text-[11px] text-[#45474a] border border-[#e3e1ec]/40">
                  <span>Acquired: {item.boughtDate}</span>
                  <span className="text-[#1a1b22] font-medium">
                    {item.rfid ? `RFID: ${item.rfid}` : item.batch ? `Batch: ${item.batch}` : item.firmware ? `FW: ${item.firmware}` : 'Indexed'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Quick Ingest Action Banner */}
      <section className="bg-[#121417] p-5 rounded-2xl text-white flex items-center justify-between gap-4 shadow-md border border-[#2f3038]">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[16px] tracking-tight">Rapid Twin Digitize</span>
          <span className="text-[12px] text-[#c6c6ca] mt-0.5 leading-snug">
            Point the camera reticle at barcode, serial, or physical object.
          </span>
        </div>
        <button
          onClick={() => onNavigate('camera')}
          className="bg-[#0051d5] hover:bg-[#316bf3] text-white px-4 py-2.5 rounded-xl font-semibold text-[13px] shrink-0 shadow flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">document_scanner</span>
          Scan
        </button>
      </section>

      {/* Interactive Floating Fast-Shutter Trigger for Immediate OCR / AI Inspection */}
      <div className="fixed right-5 bottom-20 z-40 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="bg-[#2f3038] text-[#f1effa] px-2.5 py-1 rounded-md text-[10px] font-mono shadow-md border border-white/10 opacity-90">
          {shutterHintText}
        </div>
        <button
          aria-label="Open Optical Scanner"
          onClick={handleFloatingShutterClick}
          className="w-14 h-14 rounded-full bg-[#121417] text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-90 transition-transform border border-white/20"
        >
          <div className="relative flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">photo_camera</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0051d5] rounded-full ring-2 ring-[#121417]" />
          </div>
        </button>
      </div>
    </div>
  );
};
