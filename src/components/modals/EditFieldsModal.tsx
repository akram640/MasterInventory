import React, { useState } from 'react';
import { InventoryItem } from '../../types/inventory';
import { SmoothDatePickerModal } from './SmoothDatePickerModal';

interface EditFieldsModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSave: (updatedItem: InventoryItem) => void;
}

export const EditFieldsModal: React.FC<EditFieldsModalProps> = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    serialNumber: item.serialNumber || '',
    name: item.name,
    brand: item.brand || '',
    category: item.category,
    subCategory: item.subCategory || '',
    quantity: item.quantity || '1 Unit',
    value: item.value || 0,
    priceSource: item.priceSource || '',
    condition: item.condition || 'New / Unopened',
    expiresDate: item.expiresDate || '',
    purchaseDate: item.purchaseDate || item.boughtDate || '',
    boxNumber: item.boxNumber || '',
    location: item.location || '',
    barcode: item.barcode || '',
    description: item.description || '',
    notes: item.notes || '',
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'purchase' | 'expiry'>('purchase');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...item,
      serialNumber: formData.serialNumber || undefined,
      name: formData.name.trim() || item.name,
      brand: formData.brand.trim() || undefined,
      category: formData.category,
      subCategory: formData.subCategory.trim() || undefined,
      quantity: formData.quantity.trim() || undefined,
      value: Number(formData.value) || 0,
      priceSource: formData.priceSource.trim() || undefined,
      condition: formData.condition || 'New / Unopened',
      expiresDate: formData.expiresDate.trim() || undefined,
      purchaseDate: formData.purchaseDate.trim() || undefined,
      boxNumber: formData.boxNumber.trim() || undefined,
      location: formData.location.trim() || undefined,
      barcode: formData.barcode.trim() || undefined,
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col border border-[#e3e1ec] h-[88vh] sm:h-auto sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        {/* Sticky Header */}
        <div className="px-5 py-3.5 bg-white border-b border-[#eeedf7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0051d5]">edit_note</span>
            <h3 className="font-semibold text-[16px] text-[#1a1b22]">
              Edit Asset Dossier
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#eeedf7] flex items-center justify-center text-[#45474a] hover:text-[#1a1b22]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5 text-[13px] overscroll-contain">
          {/* Row 1: Serial No & Brand */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] text-[#45474a] font-medium">Serial No.</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="e.g. 1, SN-9428"
                className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] text-[#45474a] font-medium">Brand / Manufacturer</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none font-medium"
              required
            />
          </div>

          {/* Row 3: Category & Sub-category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] text-[#45474a] font-medium">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                placeholder="e.g. Large Appliances / Laundry"
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
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  className="w-full h-10 pl-7 pr-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none font-mono tabular-nums font-semibold"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] text-[#45474a] font-medium">Price Source</label>
              <input
                type="text"
                value={formData.priceSource}
                onChange={(e) => setFormData({ ...formData, priceSource: e.target.value })}
                placeholder="e.g. Croma listed price"
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
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g. 1 Unit, 30 Tablets"
                className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] text-[#45474a] font-medium">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
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
                value={formData.boxNumber}
                onChange={(e) => setFormData({ ...formData, boxNumber: e.target.value })}
                placeholder="e.g. Box #1, N/A"
                className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] text-[#45474a] font-medium">Storage Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Bathroom, Laundry Room"
                className="h-10 px-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
              />
            </div>
          </div>

          {/* Row 7: Expiry Date, Purchase Date & Barcode (with Smooth Calendar Pickers) */}
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
                <span className="truncate">{formData.expiresDate || 'N/A'}</span>
                <span className="material-symbols-outlined text-[15px] text-[#0051d5] shrink-0">
                  event
                </span>
              </button>
            </div>

            {/* Purchase Date */}
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
                <span className="truncate font-semibold">{formData.purchaseDate || 'N/A'}</span>
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
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
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
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Key specifications, active ingredients, capacity, etc..."
              className="p-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none text-[12px] resize-none"
            />
          </div>

          {/* Row 9: Notes */}
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11px] text-[#45474a] font-medium">Notes &amp; Advisory</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Energy efficient rating, medical advice..."
              className="p-3 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none text-[12px] resize-none"
            />
          </div>

          {/* Sticky Action Footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-3 pb-2 border-t border-[#eeedf7] flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-[#eeedf7] text-[#1a1b22] font-semibold text-[13px] hover:bg-[#e8e7f1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-semibold text-[13px] shadow-md transition-colors"
            >
              Save Parameters
            </button>
          </div>
        </form>
      </div>

      {/* Smooth Calendar Date Picker Modal */}
      {isDatePickerOpen && (
        <SmoothDatePickerModal
          title={datePickerTarget === 'purchase' ? 'Select Purchase Date' : 'Select Expiry Date'}
          initialDate={datePickerTarget === 'purchase' ? formData.purchaseDate : formData.expiresDate}
          onClose={() => setIsDatePickerOpen(false)}
          onSelectDate={(chosenDate) => {
            if (datePickerTarget === 'purchase') {
              setFormData((prev) => ({ ...prev, purchaseDate: chosenDate }));
            } else {
              setFormData((prev) => ({ ...prev, expiresDate: chosenDate }));
            }
          }}
        />
      )}
    </div>
  );
};
