import React, { useMemo, useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { Bill, Unit } from '../types';
import { formatBanglaMonth, formatBDT } from '../utils/formatters';

interface MonthlyCollectionChartProps {
  bills: Bill[];
  units: Unit[];
  onCreateBill?: () => void;
}

export const MonthlyCollectionChart: React.FC<MonthlyCollectionChartProps> = ({
  bills,
  units,
  onCreateBill,
}) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [hoveredSegment, setHoveredSegment] = useState<'collected' | 'due' | null>(null);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonth]);
    for (const b of bills) {
      if (b.month) set.add(b.month);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [bills, currentMonth]);

  const unitTypeMap = useMemo(() => new Map(units.map((u) => [u.id, u.type])), [units]);
  const roomUnitsCount = useMemo(() => units.filter((u) => u.type === 'room').length, [units]);
  const shopUnitsCount = useMemo(() => units.filter((u) => u.type === 'shop').length, [units]);

  const metrics = useMemo(() => {
    const monthBills = bills.filter(
      (b) => b.month === selectedMonth && unitTypeMap.has(b.unitId)
    );
    let collected = 0;
    let due = 0;
    let roomCollected = 0;
    let roomDue = 0;
    let shopCollected = 0;
    let shopDue = 0;

    for (const b of monthBills) {
      const paid = Number(b.paidAmount || 0);
      const pending = Number(b.dueAmount || 0);
      collected += paid;
      due += pending;

      const uType = unitTypeMap.get(b.unitId) || 'room';
      if (uType === 'shop') {
        shopCollected += paid;
        shopDue += pending;
      } else {
        roomCollected += paid;
        roomDue += pending;
      }
    }

    const total = collected + due;
    const collectedPct = total > 0 ? Math.round((collected / total) * 100) : 0;
    const duePct = total > 0 ? 100 - collectedPct : 0;

    const roomTotal = roomCollected + roomDue;
    const shopTotal = shopCollected + shopDue;

    return {
      billCount: monthBills.length,
      collected,
      due,
      total,
      collectedPct,
      duePct,
      roomCollected,
      roomDue,
      roomTotal,
      shopCollected,
      shopDue,
      shopTotal,
    };
  }, [bills, selectedMonth, unitTypeMap]);

  // SVG Donut Geometry
  const radius = 64;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;
  const collectedDash =
    metrics.total > 0 ? (metrics.collected / metrics.total) * circumference : 0;
  const dueDash = metrics.total > 0 ? (metrics.due / metrics.total) * circumference : 0;

  return (
    <section
      aria-label="চলতি মাসের ভাড়া আদায় ও বকেয়া চার্ট"
      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>মাসিক ভাড়া আদায় বনাম বকেয়া চিত্র</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatBanglaMonth(selectedMonth)}
            <span aria-hidden="true" className="mx-1.5 text-slate-300">
              ·
            </span>
            <span className="font-num">{metrics.billCount}</span>টি বিল রেকর্ড
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="chart-month-select" className="text-xs font-medium text-slate-500">
            মাস:
          </label>
          <select
            id="chart-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="min-h-[38px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatBanglaMonth(m)}
                {m === currentMonth ? ' (চলতি)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {metrics.total === 0 ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            {formatBanglaMonth(selectedMonth)} মাসের কোনো বিল এখনো যুক্ত হয়নি
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            এই মাসের ভাড়া ও বিদ্যুৎ বিল যোগ করলে আদায় বনাম বকেয়ার তুলনামূলক চার্ট এখানে দেখাবে।
          </p>
          {onCreateBill && (
            <button
              type="button"
              onClick={onCreateBill}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> নতুন বিল যোগ করুন
            </button>
          )}
        </div>
      ) : (
        <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Donut Chart */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-center gap-5">
            <div className="relative w-44 h-44 shrink-0">
              <svg
                viewBox="0 0 176 176"
                className="w-full h-full -rotate-90"
                role="img"
                aria-label={`আদায় ${metrics.collectedPct}% এবং বকেয়া ${metrics.duePct}%`}
              >
                {/* Background Track */}
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth={strokeWidth}
                />

                {/* Pending Dues Segment (Rose) */}
                {dueDash > 0 && (
                  <circle
                    cx="88"
                    cy="88"
                    r={radius}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth={hoveredSegment === 'due' ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={`${dueDash} ${circumference}`}
                    strokeDashoffset={-collectedDash}
                    strokeLinecap="butt"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSegment('due')}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                )}

                {/* Collected Segment (Emerald) */}
                {collectedDash > 0 && (
                  <circle
                    cx="88"
                    cy="88"
                    r={radius}
                    fill="none"
                    stroke="#059669"
                    strokeWidth={hoveredSegment === 'collected' ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={`${collectedDash} ${circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="butt"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSegment('collected')}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                )}
              </svg>

              {/* Center Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                <span className="text-[11px] font-medium text-slate-500">
                  {hoveredSegment === 'due'
                    ? 'বকেয়া হার'
                    : hoveredSegment === 'collected'
                      ? 'আদায় হার'
                      : 'আদায় সম্পন্ন'}
                </span>
                <span
                  className={`text-2xl font-bold font-num leading-tight mt-0.5 ${
                    hoveredSegment === 'due' ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {hoveredSegment === 'due' ? `${metrics.duePct}%` : `${metrics.collectedPct}%`}
                </span>
                <span className="text-[11px] font-num text-slate-500 mt-0.5 truncate max-w-full">
                  মোট {formatBDT(metrics.total)}
                </span>
              </div>
            </div>

            {/* Interactive Legend */}
            <div className="space-y-3 w-full sm:w-auto min-w-[170px]">
              <button
                type="button"
                onMouseEnter={() => setHoveredSegment('collected')}
                onMouseLeave={() => setHoveredSegment(null)}
                onFocus={() => setHoveredSegment('collected')}
                onBlur={() => setHoveredSegment(null)}
                className="w-full text-left flex items-center justify-between gap-4 py-1.5 border-b border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">আদায় (Collected)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-num text-emerald-700 block">
                    {formatBDT(metrics.collected)}
                  </span>
                  <span className="text-[11px] font-num text-slate-500">{metrics.collectedPct}%</span>
                </div>
              </button>

              <button
                type="button"
                onMouseEnter={() => setHoveredSegment('due')}
                onMouseLeave={() => setHoveredSegment(null)}
                onFocus={() => setHoveredSegment('due')}
                onBlur={() => setHoveredSegment(null)}
                className="w-full text-left flex items-center justify-between gap-4 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-rose-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">বকেয়া (Due)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-num text-rose-600 block">
                    {formatBDT(metrics.due)}
                  </span>
                  <span className="text-[11px] font-num text-slate-500">{metrics.duePct}%</span>
                </div>
              </button>
            </div>
          </div>

          {/* Right: Horizontal Comparison & Room vs Shop Breakdown Bars */}
          <div className="lg:col-span-7 space-y-4 lg:border-l lg:border-slate-100 lg:pl-6">
            {/* Overall Month Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">সর্বমোট বিল ({formatBanglaMonth(selectedMonth)})</span>
                <span className="font-num font-bold text-slate-900">{formatBDT(metrics.total)}</span>
              </div>
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${metrics.collectedPct}%` }}
                  className="bg-emerald-600 h-full transition-all duration-300"
                  title={`আদায়: ${formatBDT(metrics.collected)}`}
                />
                <div
                  style={{ width: `${metrics.duePct}%` }}
                  className="bg-rose-600 h-full transition-all duration-300"
                  title={`বকেয়া: ${formatBDT(metrics.due)}`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-num text-slate-500">
                <span className="text-emerald-700 font-semibold">
                  আদায়: {formatBDT(metrics.collected)}
                </span>
                <span className="text-rose-600 font-semibold">
                  বকেয়া: {formatBDT(metrics.due)}
                </span>
              </div>
            </div>

            {/* Rooms Breakdown Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  আবাসিক রুম (<span className="font-num">{roomUnitsCount}</span> ইউনিট)
                </span>
                <span className="font-num font-semibold text-slate-800">
                  {formatBDT(metrics.roomTotal)}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                {metrics.roomTotal > 0 && (
                  <>
                    <div
                      style={{ width: `${(metrics.roomCollected / metrics.roomTotal) * 100}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                    />
                    <div
                      style={{ width: `${(metrics.roomDue / metrics.roomTotal) * 100}%` }}
                      className="bg-rose-500 h-full transition-all duration-300"
                    />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] font-num text-slate-500">
                <span>আদায়: {formatBDT(metrics.roomCollected)}</span>
                <span>বকেয়া: {formatBDT(metrics.roomDue)}</span>
              </div>
            </div>

            {/* Shops Breakdown Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  বাণিজ্যিক দোকান (<span className="font-num">{shopUnitsCount}</span> ইউনিট)
                </span>
                <span className="font-num font-semibold text-slate-800">
                  {formatBDT(metrics.shopTotal)}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                {metrics.shopTotal > 0 && (
                  <>
                    <div
                      style={{ width: `${(metrics.shopCollected / metrics.shopTotal) * 100}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                    />
                    <div
                      style={{ width: `${(metrics.shopDue / metrics.shopTotal) * 100}%` }}
                      className="bg-rose-500 h-full transition-all duration-300"
                    />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] font-num text-slate-500">
                <span>আদায়: {formatBDT(metrics.shopCollected)}</span>
                <span>বকেয়া: {formatBDT(metrics.shopDue)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
