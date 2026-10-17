import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InventoryItem, ScreenType } from '../../types/inventory';
import { analyzeItemWithAI } from '../../lib/api';
import { SmoothDatePickerModal } from '../modals/SmoothDatePickerModal';

interface CameraScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onItemIngested: (newItem: InventoryItem) => void;
  onOpenDossier: (item?: InventoryItem) => void;
  existingCount?: number;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onNavigate: _onNavigate,
  onItemIngested,
  onOpenDossier: _onOpenDossier,
  existingCount = 0,
}) => {
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchActive, setTorchActive] = useState(false);
  const [macroActive, setMacroActive] = useState(false);
  const [scanMode, setScanMode] = useState<'neural' | 'barcode'>('neural');
  const [activeCategory, setActiveCategory] = useState('Auto-Detect');
  const [isCapturing, setIsCapturing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState('Inspecting item with Gemini AI...');

  // Snapped photo review modal state & granular inventory fields
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Form states matching user's exact specification
  const [serialNo, setSerialNo] = useState('1');
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<string>('Health & Wellness');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('N/A');
  const [quantity, setQuantity] = useState('1 Unit');
  const [boxNo, setBoxNo] = useState('N/A');
  const [expiryDate, setExpiryDate] = useState('N/A');
  const [purchaseDate, setPurchaseDate] = useState('N/A');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [priceSource, setPriceSource] = useState('Estimated Indian Market Retail Price');
  const [condition, setCondition] = useState('New / Unopened');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('Personal Vault');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'purchase' | 'expiry'>('purchase');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-start real camera stream when entering screen
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Try environment (rear) camera first on phones
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      setStreamActive(true);
    } catch (err: unknown) {
      console.warn('Live camera stream error:', err);
      setStreamActive(false);
      setCameraError(
        'Camera permission pending or blocked by browser. You can tap "Open Native Camera" below to use your phone camera.'
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Flashlight / Torch toggle
  const toggleTorch = async () => {
    setTorchActive((prev) => !prev);
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        const capabilities = (track as unknown as { getCapabilities?: () => { torch?: boolean } })?.getCapabilities?.();
        if (capabilities && 'torch' in capabilities) {
          await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
            advanced: [{ torch: !torchActive }],
          });
        }
      } catch {
        // Torch constraint not supported
      }
    }
  };

  // Process captured photo through Gemini AI Vision pipeline
  const handlePhotoCaptured = async (dataUrl: string) => {
    setCapturedPhotoUrl(dataUrl);
    setIsAnalyzing(true);
    setAnalyzingStatus('Analyzing image with Gemini 3.8 Flash & querying Indian market retail price...');

    const nextSerial = String(existingCount + 1);
    setSerialNo(nextSerial);
    setProductName(`Inspecting Asset #${nextSerial}...`);

    try {
      const result = await analyzeItemWithAI(dataUrl, existingCount);
      if (result) {
        setSerialNo(result.serialNo || nextSerial);
        setProductName(result.productName || 'Captured Asset');
        setBrand(result.brand || '');
        setCategory(result.category || (activeCategory !== 'Auto-Detect' ? activeCategory : 'Health & Wellness'));
        setSubCategory(result.subCategory || '');
        setDescription(result.description || '');
        setBarcode(result.barcode || 'N/A');
        setQuantity(result.quantity || '1 Unit');
        setBoxNo(result.boxNo || 'N/A');
        setExpiryDate(result.expiryDate || 'N/A');
        setPurchaseDate(result.purchaseDate || 'N/A');
        setPurchasePrice(typeof result.purchasePrice === 'number' ? result.purchasePrice : 0);
        setPriceSource(result.priceSource || 'Estimated Indian Market Retail Price');
        setCondition(result.condition || 'New / Unopened');
        setNotes(result.notes || '');
      } else {
        setSerialNo(nextSerial);
        setProductName(`Captured Asset ${nextSerial}`);
        setCategory(activeCategory !== 'Auto-Detect' ? activeCategory : 'Health & Wellness');
        setSubCategory('General Ingest');
        setDescription('Photo captured with camera.');
        setPurchasePrice(0);
        setPriceSource('Manual Entry');
        setCondition('New / Unopened');
      }
    } catch (err) {
      console.warn('AI analysis error, fallback to manual entry:', err);
      setSerialNo(nextSerial);
      setProductName(`Captured Asset ${nextSerial}`);
      setCategory(activeCategory !== 'Auto-Detect' ? activeCategory : 'Health & Wellness');
      setPurchasePrice(0);
      setPriceSource('Manual Entry');
    } finally {
      setIsAnalyzing(false);
      setIsReviewOpen(true);
    }
  };

  // Center Shutter Button Clicked
  const handleShutterClick = () => {
    setIsCapturing(true);

    // Audio chime feedback
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // Audio muted
    }

    // 1. If live video stream is running, snapshot real video frame
    if (streamActive && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setTimeout(() => {
          setIsCapturing(false);
          handlePhotoCaptured(dataUrl);
        }, 200);
        return;
      }
    }

    // 2. If live stream not running (e.g. mobile permission pending), trigger phone native camera app!
    setTimeout(() => {
      setIsCapturing(false);
      nativeCameraInputRef.current?.click();
    }, 150);
  };

  // When user takes a photo with the mobile phone camera via file input
  const handleNativeCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handlePhotoCaptured(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save the verified asset to Master Inventory
  const handleSaveScannedAsset = () => {
    if (!capturedPhotoUrl) return;

    const catSlug = (category || 'AST').toUpperCase().slice(0, 3).replace(/[^A-Z]/g, 'AST') || 'AST';
    const newItem: InventoryItem = {
      id: `real-item-${Date.now()}`,
      code: `#${catSlug}-${Math.floor(1000 + Math.random() * 9000)}`,
      serialNumber: serialNo || String(existingCount + 1),
      name: productName.trim() || 'Physical Asset',
      subname: brand ? `${brand} · ${subCategory || category}` : (subCategory || category),
      category,
      subCategory: subCategory || undefined,
      description: description || undefined,
      brand: brand || undefined,
      barcode: barcode && barcode !== 'N/A' ? barcode : undefined,
      quantity: quantity || undefined,
      boxNumber: boxNo && boxNo !== 'N/A' ? boxNo : undefined,
      expiresDate: expiryDate && expiryDate !== 'N/A' ? expiryDate : undefined,
      purchaseDate: purchaseDate && purchaseDate !== 'N/A' ? purchaseDate : undefined,
      value: Number(purchasePrice) || 0,
      priceSource: priceSource || undefined,
      condition: condition || 'New / Unopened',
      notes: notes || undefined,
      location: location || 'Personal Vault',
      status: 'Active',
      statusLabel: 'Verified Ingest',
      badgeType: 'emerald',
      boughtDate: purchaseDate && purchaseDate !== 'N/A' ? purchaseDate : new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      imageUrl: capturedPhotoUrl,
      imageAlt: productName || 'Captured physical asset',
    };

    onItemIngested(newItem);
    setIsReviewOpen(false);
    setToastMessage(`Saved "${newItem.name}" to Master Inventory Table.`);
    setTimeout(() => {
      setToastMessage(null);
      _onNavigate('inventory');
    }, 700);
  };

  const categories = [
    'Auto-Detect',
    'Health & Wellness',
    'Home Appliances',
    'Electronics',
    'Medicine',
    'Apparel',
    'Furniture',
    'Vehicles',
    'Documents'
  ];

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 pt-20 pb-28 gap-4 select-none">
      {/* Offscreen Canvas for Snapshotting real video frame */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden Native Phone Camera Input (opens native camera app on iOS/Android) */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeCameraFile}
      />

      {/* Hidden Gallery Input */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleNativeCameraFile}
      />

      {/* Live Camera Viewport Container */}
      <div className="relative w-full aspect-[4/5] max-h-[580px] bg-[#121417] overflow-hidden rounded-3xl shadow-2xl border border-[#2f3038]">
        {/* Real Live Camera Video */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            streamActive ? 'opacity-100' : 'opacity-0'
          } ${macroActive ? 'scale-125' : 'scale-100'}`}
        />

        {/* Fallback Viewport if Stream Not Yet Active */}
        {!streamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#1a1c1f] gap-3">
            <div className="w-16 h-16 rounded-3xl bg-[#2f3038] flex items-center justify-center text-[#0051d5] shadow-lg">
              <span className="material-symbols-outlined text-[36px]">photo_camera</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[16px] text-white">Camera Ready</span>
              <span className="text-[12px] text-[#c6c6ca] max-w-xs">
                Tap below to grant camera access or snap a photo directly using your phone&apos;s camera.
              </span>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="w-full h-11 bg-[#0051d5] hover:bg-[#316bf3] text-white rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">camera_alt</span>
                <span>Open Phone Camera</span>
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="w-full h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">videocam</span>
                <span>Retry Live Stream</span>
              </button>
            </div>
          </div>
        )}

        {/* Torch Beam Glow Overlay */}
        {torchActive && (
          <div className="absolute inset-0 bg-white/15 mix-blend-screen pointer-events-none" />
        )}

        {/* Shutter White Flash Animation */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 opacity-95" />
        )}

        {/* Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121417]/90 via-transparent to-[#121417]/60 pointer-events-none" />

        {/* Laser Scanner Sweep Line */}
        <div className="absolute inset-x-4 top-16 bottom-16 pointer-events-none overflow-hidden flex flex-col justify-between">
          <div className="w-full h-0.5 bg-[#316bf3] shadow-[0_0_14px_#316bf3] opacity-90 animate-scan-laser" />
        </div>

        {/* Top Camera HUD */}
        <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5 bg-[#121417]/80 backdrop-blur-md rounded-full px-2 py-1 border border-white/15">
            {/* Torch Button */}
            <button
              onClick={toggleTorch}
              title={torchActive ? 'Torch Off' : 'Torch On'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                torchActive ? 'bg-[#0051d5] text-white shadow-sm' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {torchActive ? 'flashlight_on' : 'flashlight_off'}
              </span>
            </button>

            {/* Macro Lens Button */}
            <button
              onClick={() => setMacroActive(!macroActive)}
              title="Toggle Macro Optical Focus"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                macroActive ? 'bg-[#0051d5] text-white shadow-sm' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">macro_auto</span>
            </button>
          </div>

          {/* Mode Switch: Vision AI vs 1D/2D */}
          <div className="flex items-center bg-[#121417]/80 backdrop-blur-md p-0.5 rounded-full border border-white/15">
            <button
              onClick={() => setScanMode('neural')}
              className={`px-3 py-1 rounded-full text-[12px] font-medium flex items-center gap-1 transition-all ${
                scanMode === 'neural'
                  ? 'bg-[#0051d5] text-white shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              <span>Vision AI</span>
            </button>
            <button
              onClick={() => setScanMode('barcode')}
              className={`px-3 py-1 rounded-full text-[12px] font-medium flex items-center gap-1 transition-all ${
                scanMode === 'barcode'
                  ? 'bg-[#0051d5] text-white shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
              <span>1D/2D</span>
            </button>
          </div>

          {/* Live Camera State Indicator */}
          <div className="bg-[#121417]/80 backdrop-blur-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 border border-white/15">
            <span
              className={`w-2 h-2 rounded-full ${
                streamActive ? 'bg-[#069669] animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-white font-mono text-[11px] font-semibold">
              {streamActive ? 'LIVE' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Targeting Reticle Frame */}
        <div className="absolute inset-x-8 top-24 bottom-24 pointer-events-none flex flex-col justify-between items-center z-10">
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg transform -translate-y-2 pointer-events-auto border border-[#c6c6ca]/40">
            <span className="w-2 h-2 rounded-full bg-[#069669] animate-pulse" />
            <span className="text-[12px] font-semibold text-[#1a1b22]">
              {streamActive ? 'Optical Reticle Active' : 'Ready to Snap'}
            </span>
            <span className="font-mono text-[11px] bg-[#eeedf7] px-1.5 py-0.5 rounded text-[#0051d5] font-bold">
              1080p
            </span>
          </div>

          {/* Center Precision Corner Brackets */}
          <div className="relative w-full flex-1 mx-2 my-1 flex items-center justify-center">
            <svg
              className="absolute inset-0 w-full h-full text-[#316bf3] drop-shadow-[0_0_8px_rgba(49,107,243,0.7)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Top Left */}
              <path d="M 0 32 L 0 0 L 32 0" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              {/* Top Right */}
              <path d="M calc(100% - 32) 0 L 100% 0 L 100% 32" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              {/* Bottom Left */}
              <path d="M 0 calc(100% - 32) L 0 100% L 32 100%" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              {/* Bottom Right */}
              <path d="M calc(100% - 32) 100% L 100% 100% L 100% calc(100% - 32)" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              {/* Center Crosshair */}
              <circle cx="50%" cy="50%" fill="currentColor" opacity="0.8" r="4" />
              <line stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" x1="45%" x2="48%" y1="50%" y2="50%" />
              <line stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" x1="52%" x2="55%" y1="50%" y2="50%" />
            </svg>
          </div>

          <div className="flex items-center gap-2 bg-[#121417]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white transform translate-y-2 pointer-events-auto border border-white/10">
            <span className="material-symbols-outlined text-[15px] text-[#b4c5ff]">document_scanner</span>
            <span className="font-mono text-[11px] text-white">
              Center barcode, label, or item in reticle
            </span>
          </div>
        </div>
      </div>

      {cameraError && (
        <div className="bg-amber-50 text-amber-900 border border-amber-200 p-3 rounded-2xl text-[12px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0">info</span>
            <span className="leading-snug">{cameraError}</span>
          </div>
          <button
            onClick={() => nativeCameraInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-amber-200/60 font-semibold text-[11px] shrink-0 text-amber-900 hover:bg-amber-200"
          >
            Open Camera
          </button>
        </div>
      )}

      {/* Category Filter Horizontal Scroller */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium shrink-0 flex items-center gap-1.5 transition-all active:scale-95 ${
              activeCategory === cat
                ? 'bg-[#121417] text-white shadow-sm'
                : 'bg-[#eeedf7] text-[#1a1b22] hover:bg-[#e8e7f1]'
            }`}
          >
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Shutter Deck */}
      <div className="flex items-center justify-between px-6 pt-2">
        {/* Gallery / Import */}
        <button
          aria-label="Upload Photo from Gallery"
          onClick={() => galleryInputRef.current?.click()}
          className="flex flex-col items-center gap-1 text-[#45474a] hover:text-[#1a1b22] transition-colors p-1 active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#eeedf7] flex items-center justify-center shadow-sm hover:bg-[#e8e7f1] border border-[#c6c6ca]/40">
            <span className="material-symbols-outlined text-[22px]">photo_library</span>
          </div>
          <span className="text-[11px] font-medium">Gallery</span>
        </button>

        {/* Center Shutter Button */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-3 rounded-full bg-[#0051d5]/20 blur-md animate-pulse pointer-events-none" />
          <button
            aria-label="Snap Real Photo"
            onClick={handleShutterClick}
            className="relative w-20 h-20 rounded-full bg-white p-1.5 shadow-2xl flex items-center justify-center active:scale-90 transition-transform border border-[#e3e1ec]"
          >
            <div className="w-full h-full rounded-full bg-[#0051d5] flex items-center justify-center shadow-inner hover:bg-[#316bf3] transition-colors">
              <span className="material-symbols-outlined text-white text-[34px]">
                photo_camera
              </span>
            </div>
          </button>
        </div>

        {/* Native Camera Shortcut */}
        <button
          aria-label="Open Native Mobile Camera"
          onClick={() => nativeCameraInputRef.current?.click()}
          className="flex flex-col items-center gap-1 text-[#45474a] hover:text-[#1a1b22] transition-colors p-1 active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#eeedf7] flex items-center justify-center shadow-sm hover:bg-[#e8e7f1] border border-[#c6c6ca]/40">
            <span className="material-symbols-outlined text-[22px]">camera_alt</span>
          </div>
          <span className="text-[11px] font-medium">Snap</span>
        </button>
      </div>

      {/* AI Analyzing HUD Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="bg-[#121417] text-white p-6 rounded-3xl max-w-sm w-full border border-white/10 shadow-2xl flex flex-col items-center gap-4">
            <div className="relative w-24 h-24 rounded-2xl bg-[#1e2229] border border-[#0051d5]/40 flex items-center justify-center overflow-hidden shadow-inner">
              {capturedPhotoUrl ? (
                <img src={capturedPhotoUrl} alt="Analyzing" className="w-full h-full object-cover opacity-60" />
              ) : (
                <span className="material-symbols-outlined text-[40px] text-[#0051d5]">document_scanner</span>
              )}
              {/* Laser scanning beam */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#316bf3] to-transparent shadow-[0_0_14px_#0051d5] animate-bounce" />
            </div>

            <div className="flex flex-col gap-1.5 items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0051d5] animate-ping" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#316bf3] font-bold">
                  Gemini Vision &amp; Market Engine
                </span>
              </div>
              <h3 className="font-semibold text-[16px] text-white">Analyzing Physical Asset</h3>
              <p className="text-[12px] text-[#c6c6ca] leading-relaxed max-w-xs">
                {analyzingStatus}
              </p>
            </div>

            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#0051d5] animate-pulse w-4/5 rounded-full" />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAnalyzing(false);
                setIsReviewOpen(true);
              }}
              className="text-[12px] text-[#c6c6ca] hover:text-white underline mt-1"
            >
              Skip to Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* Review & Verification Modal */}
      {isReviewOpen && capturedPhotoUrl && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col border border-[#e3e1ec] h-[90vh] sm:h-auto sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            {/* Modal Sticky Header */}
            <div className="px-5 py-3.5 bg-white border-b border-[#eeedf7] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0051d5] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-semibold text-[15px] text-[#1a1b22]">Verified Asset Ingestion</h3>
                  <span className="font-mono text-[10px] text-[#069669] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#069669]" /> AI Auto-Detected • Fully Editable
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="w-8 h-8 rounded-full bg-[#eeedf7] flex items-center justify-center text-[#45474a] hover:text-[#1a1b22]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5 text-[13px] overscroll-contain">
              {/* Captured Photo Strip with Snapshot Metadata */}
              <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-[#121417] border border-[#e3e1ec] flex items-center justify-center group shrink-0">
                <img
                  src={capturedPhotoUrl}
                  alt={productName || 'Captured asset preview'}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
                  OPTICAL SNAPSHOT
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewOpen(false);
                    nativeCameraInputRef.current?.click();
                  }}
                  className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-[#1a1b22] px-2.5 py-1 rounded-lg font-mono text-[11px] font-medium shadow flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">flip_camera_ios</span>
                  <span>Retake</span>
                </button>
              </div>

              {/* Granular 14-Field Editable Form */}
              <div className="flex flex-col gap-3 text-[13px]">
                {/* Row 1: Serial No & Brand */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Serial No.</label>
                    <input
                      type="text"
                      value={serialNo}
                      onChange={(e) => setSerialNo(e.target.value)}
                      placeholder="e.g. 1, SN-9428"
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Brand / Manufacturer</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Cutihance, Whirlpool"
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Product Name */}
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[11px] text-[#45474a] font-medium">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Official Product Name"
                    className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none font-medium"
                  />
                </div>

                {/* Row 3: Category & Sub-category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
                    >
                      <option value="Health & Wellness">Health &amp; Wellness</option>
                      <option value="Home Appliances">Home Appliances</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Wardrobe & Apparel">Wardrobe &amp; Apparel</option>
                      <option value="Home & Furniture">Home &amp; Furniture</option>
                      <option value="Vehicles & Mobility">Vehicles &amp; Mobility</option>
                      <option value="Documents & Valuables">Documents &amp; Valuables</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Sub-Category</label>
                    <input
                      type="text"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      placeholder="e.g. Dietary Supplements / Laundry"
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
                    />
                  </div>
                </div>

                {/* Row 4: Purchase Price (₹ INR) & Price Source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Purchase Price (₹ INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-mono text-[#45474a]">₹</span>
                      <input
                        type="number"
                        step="any"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                        className="w-full h-10 pl-7 pr-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none font-mono tabular-nums font-semibold"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Price Source</label>
                    <input
                      type="text"
                      value={priceSource}
                      onChange={(e) => setPriceSource(e.target.value)}
                      placeholder="e.g. Croma listed price, Label MRP"
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none text-[12px]"
                    />
                  </div>
                </div>

                {/* Row 5: Quantity & Condition */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Quantity</label>
                    <input
                      type="text"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 30 Tablets, 1 Unit"
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
                    >
                      <option value="New / Unopened">New / Unopened</option>
                      <option value="Good / Pristine">Good / Pristine</option>
                      <option value="Gently Used">Gently Used</option>
                      <option value="Refurbished">Refurbished</option>
                    </select>
                  </div>
                </div>

                {/* Row 6: Box No & Storage Location */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Box No.</label>
                    <input
                      type="text"
                      value={boxNo}
                      onChange={(e) => setBoxNo(e.target.value)}
                      placeholder="e.g. Box #1, N/A"
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[11px] text-[#45474a] font-medium">Storage Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Bathroom Shelf, Laundry Setup"
                      className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
                    />
                  </div>
                </div>

                {/* Row 7: Expiry Date, Purchase Date & Barcode (with Interactive Smooth Calendar Pickers) */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Expiry Date */}
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] text-[#45474a] font-medium truncate">Expiry Date</label>
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerTarget('expiry');
                        setIsDatePickerOpen(true);
                      }}
                      className="h-10 px-2 bg-[#f4f2fd] hover:bg-[#eae8f7] rounded-xl border border-[#c6c6ca]/50 flex items-center justify-between text-[11px] font-mono text-[#1a1b22] text-left transition-colors active:scale-95"
                    >
                      <span className="truncate">{expiryDate || 'N/A'}</span>
                      <span className="material-symbols-outlined text-[15px] text-[#0051d5] shrink-0">
                        event
                      </span>
                    </button>
                  </div>

                  {/* Purchase Date with Smooth Calendar Selection */}
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] text-[#0051d5] font-semibold truncate flex items-center gap-0.5">
                      Purchase Date
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerTarget('purchase');
                        setIsDatePickerOpen(true);
                      }}
                      className="h-10 px-2 bg-[#f4f2fd] hover:bg-[#eae8f7] rounded-xl border border-[#0051d5]/40 flex items-center justify-between text-[11px] font-mono text-[#1a1b22] text-left transition-colors active:scale-95 ring-1 ring-[#0051d5]/20 shadow-xs"
                    >
                      <span className="truncate font-semibold">{purchaseDate || 'N/A'}</span>
                      <span className="material-symbols-outlined text-[16px] text-[#0051d5] shrink-0">
                        calendar_month
                      </span>
                    </button>
                  </div>

                  {/* Barcode */}
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] text-[#45474a] font-medium truncate">Barcode</label>
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="N/A"
                      className="h-10 px-2.5 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none text-[12px]"
                    />
                  </div>
                </div>

                {/* Row 8: Description */}
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[11px] text-[#45474a] font-medium">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Key specs, active ingredients, capacity, and details..."
                    className="p-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none text-[12px] resize-none"
                  />
                </div>

                {/* Row 9: Notes */}
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[11px] text-[#45474a] font-medium">Notes &amp; Advisory</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Suggested by dermatologist, energy star rating..."
                    className="p-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none text-[12px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Action Footer (ALWAYS VISIBLE & CLEARLY ACCESSIBLE ON IPHONE 13) */}
            <div className="px-5 py-3.5 bg-white border-t border-[#eeedf7] flex items-center gap-2.5 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20 pb-7 sm:pb-3.5">
              <button
                type="button"
                onClick={() => {
                  setIsReviewOpen(false);
                  galleryInputRef.current?.click();
                }}
                className="h-12 px-4 rounded-xl bg-[#eeedf7] text-[#1a1b22] font-semibold text-[13px] hover:bg-[#e8e7f1] active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">file_upload</span>
                <span>Upload New</span>
              </button>
              <button
                type="button"
                onClick={handleSaveScannedAsset}
                className="flex-1 h-12 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-semibold text-[14px] shadow-lg shadow-[#0051d5]/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Save to Master Inventory</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smooth Calendar Date Picker Modal (Year, Month, Day) */}
      {isDatePickerOpen && (
        <SmoothDatePickerModal
          title={datePickerTarget === 'purchase' ? 'Select Purchase Date' : 'Select Expiry Date'}
          initialDate={datePickerTarget === 'purchase' ? purchaseDate : expiryDate}
          onClose={() => setIsDatePickerOpen(false)}
          onSelectDate={(chosenDate) => {
            if (datePickerTarget === 'purchase') {
              setPurchaseDate(chosenDate);
            } else {
              setExpiryDate(chosenDate);
            }
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 inset-x-4 max-w-sm mx-auto bg-[#121417] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 z-50 border border-white/10 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[#069669] text-[22px] shrink-0">
              check_circle
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[13px] leading-tight truncate">
                {toastMessage}
              </span>
              <span className="text-[11px] text-[#c6c6ca] mt-0.5">
                Saved into your real inventory database.
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-[#002114] bg-[#85f8c4] px-2 py-0.5 rounded shrink-0">
            REAL
          </span>
        </div>
      )}
    </div>
  );
};
