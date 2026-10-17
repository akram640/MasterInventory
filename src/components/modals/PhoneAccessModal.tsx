import React, { useState } from 'react';

interface PhoneAccessModalProps {
  onClose: () => void;
}

export const PhoneAccessModal: React.FC<PhoneAccessModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const liveUrl = window.location.href.includes('localhost')
    ? 'https://ais-pre-alhgyaawtorg6htvrvxv5f-276265182689.asia-southeast1.run.app'
    : window.location.href;

  const handleCopy = () => {
    navigator.clipboard?.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // QR code encoded data URL using reliable standard QR generator service
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    liveUrl
  )}&color=121417&bgcolor=ffffff&qzone=1`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-[#e3e1ec] animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#eeedf7]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0051d5] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">smartphone</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-semibold text-[15px] text-[#1a1b22]">Access on Your Mobile Phone</h3>
              <span className="font-mono text-[10px] text-[#45474a]">PWA CAMERA SCANNER READY</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#eeedf7] flex items-center justify-center text-[#45474a] hover:text-[#1a1b22]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center p-4 bg-[#f4f2fd] rounded-2xl border border-[#e3e1ec]/60 gap-3">
          <div className="p-3 bg-white rounded-2xl shadow-md border border-[#c6c6ca]/40">
            <img
              src={qrCodeUrl}
              alt="Scan QR Code to open on phone"
              className="w-44 h-44 object-contain"
            />
          </div>
          <div className="text-center">
            <span className="font-semibold text-[13px] text-[#1a1b22] block">
              Scan with your Phone Camera
            </span>
            <span className="text-[11px] text-[#45474a] block mt-0.5">
              Open the Camera app on your iPhone or Android and point it here.
            </span>
          </div>
        </div>

        {/* Copy Link Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={liveUrl}
            className="flex-1 h-10 px-3 bg-[#f4f2fd] rounded-xl text-[12px] font-mono border border-[#c6c6ca]/50 text-[#1a1b22] outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="h-10 px-3.5 bg-[#121417] hover:bg-[#1a1c1f] text-white rounded-xl text-[12px] font-semibold shrink-0 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Instructions Breakdown */}
        <div className="flex flex-col gap-2.5 pt-1 text-[12px]">
          {/* iOS Safari */}
          <div className="p-3 rounded-xl bg-[#fbf8ff] border border-[#e3e1ec] flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#0051d5] text-[18px] shrink-0 mt-0.5">
              apple
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-[#1a1b22]">iPhone (Safari)</span>
              <span className="text-[#45474a] mt-0.5 leading-snug">
                1. Open the link in Safari &bull; 2. Tap the <strong>Share</strong> button (box with upward arrow) &bull; 3. Select <strong>Add to Home Screen</strong> for a full-screen app experience.
              </span>
            </div>
          </div>

          {/* Android Chrome */}
          <div className="p-3 rounded-xl bg-[#fbf8ff] border border-[#e3e1ec] flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#069669] text-[18px] shrink-0 mt-0.5">
              android
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-[#1a1b22]">Android (Chrome)</span>
              <span className="text-[#45474a] mt-0.5 leading-snug">
                1. Open in Chrome &bull; 2. Tap the <strong>three dots (&vellip;)</strong> menu &bull; 3. Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 bg-[#121417] text-white rounded-xl font-semibold text-[13px] hover:bg-[#1a1c1f] transition-colors shadow-sm"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
