import React, { useState } from 'react';

interface SmoothDatePickerModalProps {
  initialDate?: string;
  title?: string;
  onClose: () => void;
  onSelectDate: (dateString: string) => void;
}

export const SmoothDatePickerModal: React.FC<SmoothDatePickerModalProps> = ({
  initialDate,
  title = 'Select Date',
  onClose,
  onSelectDate,
}) => {
  // Parse initial date or default to current date
  const parseInitialDate = () => {
    if (!initialDate || initialDate === 'N/A') return new Date();
    const parsed = new Date(initialDate);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const initial = parseInitialDate();
  const [selectedYear, setSelectedYear] = useState<number>(initial.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(initial.getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState<number>(initial.getDate());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  // Generate year options from 1995 to currentYear + 5
  const yearOptions: number[] = [];
  for (let y = currentYear + 5; y >= 1995; y--) {
    yearOptions.push(y);
  }

  // Calculate days in selected month and year
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sunday

  // Handle month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Format the date output: "16 Oct 2026" and ISO YYYY-MM-DD
  const formatFinalDate = (d: number, m: number, y: number) => {
    const monthShort = monthNames[m].slice(0, 3);
    const dayStr = String(d).padStart(2, '0');
    return `${dayStr} ${monthShort} ${y}`;
  };

  const handleConfirm = () => {
    // If selectedDay is beyond daysInMonth, cap it
    const validDay = Math.min(selectedDay, daysInMonth);
    const dateFormatted = formatFinalDate(validDay, selectedMonth, selectedYear);
    onSelectDate(dateFormatted);
    onClose();
  };

  const handleSetToday = () => {
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
    setSelectedDay(today.getDate());
    const dateFormatted = formatFinalDate(today.getDate(), today.getMonth(), today.getFullYear());
    onSelectDate(dateFormatted);
    onClose();
  };

  const handleSetYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setSelectedYear(yest.getFullYear());
    setSelectedMonth(yest.getMonth());
    setSelectedDay(yest.getDate());
    const dateFormatted = formatFinalDate(yest.getDate(), yest.getMonth(), yest.getFullYear());
    onSelectDate(dateFormatted);
    onClose();
  };

  const handleClearNA = () => {
    onSelectDate('N/A');
    onClose();
  };

  // Day array for calendar grid
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const isToday = (day: number) => {
    const now = new Date();
    return (
      now.getDate() === day &&
      now.getMonth() === selectedMonth &&
      now.getFullYear() === selectedYear
    );
  };

  const isSelected = (day: number) => day === selectedDay;

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col border border-[#e3e1ec] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
      >
        {/* Header with Title and Current Selection Display */}
        <div className="p-4 bg-[#f4f2fd] border-b border-[#e3e1ec] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#45474a] font-medium">
              {title}
            </span>
            <span className="text-[16px] font-semibold text-[#1a1b22] font-mono">
              {formatFinalDate(Math.min(selectedDay, daysInMonth), selectedMonth, selectedYear)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#45474a] hover:text-[#1a1b22] shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Quick Presets Ribbon */}
        <div className="px-4 py-2.5 bg-white border-b border-[#eeedf7] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={handleSetToday}
            className="px-2.5 py-1 rounded-full bg-[#f4f2fd] hover:bg-[#e8e7f1] text-[#0051d5] text-[11px] font-mono font-semibold shrink-0 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleSetYesterday}
            className="px-2.5 py-1 rounded-full bg-[#f4f2fd] hover:bg-[#e8e7f1] text-[#1a1b22] text-[11px] font-mono font-medium shrink-0 transition-colors"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={handleClearNA}
            className="px-2.5 py-1 rounded-full bg-[#ffdad6]/40 hover:bg-[#ffdad6] text-[#ba1a1a] text-[11px] font-mono font-medium shrink-0 transition-colors"
          >
            Set to N/A
          </button>
        </div>

        {/* Smooth Month & Year Selection Bar */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
          {/* Month selector dropdown */}
          <div className="flex items-center gap-1 flex-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 px-2.5 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 font-semibold text-[13px] text-[#1a1b22] outline-none focus:ring-2 focus:ring-[#0051d5]/30 cursor-pointer flex-1"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            {/* Year selector dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 px-2 bg-[#f4f2fd] rounded-xl border border-[#c6c6ca]/50 font-mono font-semibold text-[13px] text-[#1a1b22] outline-none focus:ring-2 focus:ring-[#0051d5]/30 cursor-pointer w-24"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month Steppers */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="w-8 h-8 rounded-lg bg-[#eeedf7] hover:bg-[#e8e7f1] flex items-center justify-center text-[#1a1b22] transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="w-8 h-8 rounded-lg bg-[#eeedf7] hover:bg-[#e8e7f1] flex items-center justify-center text-[#1a1b22] transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Calendar Day Grid */}
        <div className="px-4 py-2">
          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 text-center font-mono text-[11px] text-[#76777a] font-semibold mb-1.5">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {blankDays.map((_, i) => (
              <div key={`blank-${i}`} className="w-9 h-9" />
            ))}
            {daysArray.map((day) => {
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`w-9 h-9 rounded-xl font-mono text-[12px] flex items-center justify-center transition-all relative ${
                    selected
                      ? 'bg-[#0051d5] text-white font-bold shadow-md scale-105 z-10'
                      : today
                      ? 'bg-[#f4f2fd] text-[#0051d5] font-bold border border-[#0051d5]/40 hover:bg-[#e8e7f1]'
                      : 'text-[#1a1b22] hover:bg-[#f4f2fd]'
                  }`}
                >
                  {day}
                  {today && !selected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#0051d5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-white border-t border-[#eeedf7] flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-[#eeedf7] text-[#1a1b22] font-semibold text-[13px] hover:bg-[#e8e7f1] active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-11 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-semibold text-[13px] shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            <span>Apply Date</span>
          </button>
        </div>
      </div>
    </div>
  );
};
