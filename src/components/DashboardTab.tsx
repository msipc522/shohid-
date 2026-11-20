import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  BellRing,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  FileSpreadsheet,
  Home,
  LayoutGrid,
  Plus,
  Search,
  Store,
  Table2,
  User,
  X,
} from 'lucide-react';
import { Bill, Tenant, Unit, UnitFilter, UnitType } from '../types';
import { formatBanglaMonth, formatBDT } from '../utils/formatters';
import { MonthlyCollectionChart } from './MonthlyCollectionChart';

interface DashboardTabProps {
  units: Unit[];
  tenants: Tenant[];
  bills: Bill[];
  onOpenUnitDetail: (unitId: string) => void;
  onNewBill?: () => void;
  onManageFamilyRooms: () => void;
  onAssignTenant?: (unitId: string) => void;
  onVacateUnit?: (unit: Unit) => void;
  onToggleFamilyCategory?: (unit: Unit, nextType: UnitType) => Promise<void>;
  onExportExcel?: () => Promise<void>;
}

type UnitStatusOption = 'empty' | 'fillup' | 'family';

interface UnpaidCurrentMonthItem {
  unit: Unit;
  tenant: Tenant;
  reason: 'no_bill' | 'partial_due' | 'unpaid_bill';
  currentMonthDue: number;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  units,
  tenants,
  bills,
  onOpenUnitDetail,
  onNewBill,
  onManageFamilyRooms,
  onAssignTenant,
  onVacateUnit,
  onToggleFamilyCategory,
  onExportExcel,
}) => {
  const [filter, setFilter] = useState<UnitFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [bannerExpanded, setBannerExpanded] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const rentableUnits = useMemo(() => units.filter((u) => u.type !== 'family'), [units]);
  const familyUnitsAll = useMemo(() => units.filter((u) => u.type === 'family'), [units]);
  const rentableUnitIds = useMemo(
    () => new Set(rentableUnits.map((u) => u.id)),
    [rentableUnits]
  );
  const rentableBills = useMemo(
    () => bills.filter((b) => rentableUnitIds.has(b.unitId)),
    [bills, rentableUnitIds]
  );

  const activeTenantsByUnit = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const t of tenants) {
      if (!t.outDate) {
        map.set(t.unitId, t);
      }
    }
    return map;
  }, [tenants]);

  const dueByUnit = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bills) {
      map.set(b.unitId, (map.get(b.unitId) || 0) + Number(b.dueAmount || 0));
    }
    return map;
  }, [bills]);

  const currentMonthBillsByUnit = useMemo(() => {
    const map = new Map<string, Bill[]>();
    for (const b of bills) {
      if (b.month === currentMonth) {
        const list = map.get(b.unitId) || [];
        list.push(b);
        map.set(b.unitId, list);
      }
    }
    return map;
  }, [bills, currentMonth]);

  const unpaidCurrentMonthList = useMemo<UnpaidCurrentMonthItem[]>(() => {
    const items: UnpaidCurrentMonthItem[] = [];
    for (const unit of rentableUnits) {
      const tenant = activeTenantsByUnit.get(unit.id);
      if (!tenant) continue;

      const monthBills = currentMonthBillsByUnit.get(unit.id) || [];
      if (monthBills.length === 0) {
        items.push({
          unit,
          tenant,
          reason: 'no_bill',
          currentMonthDue: Number(tenant.rent || unit.defaultRent || 0),
        });
      } else {
        const totalMonthDue = monthBills.reduce((s, b) => s + Number(b.dueAmount || 0), 0);
        const totalMonthPaid = monthBills.reduce((s, b) => s + Number(b.paidAmount || 0), 0);
        if (totalMonthDue > 0 || totalMonthPaid === 0) {
          items.push({
            unit,
            tenant,
            reason: totalMonthPaid > 0 ? 'partial_due' : 'unpaid_bill',
            currentMonthDue: totalMonthDue > 0 ? totalMonthDue : Number(tenant.rent || 0),
          });
        }
      }
    }
    return items;
  }, [rentableUnits, activeTenantsByUnit, currentMonthBillsByUnit]);

  const unpaidCurrentMonthMap = useMemo(
    () => new Map(unpaidCurrentMonthList.map((item) => [item.unit.id, item])),
    [unpaidCurrentMonthList]
  );

  const stats = useMemo(() => {
    const activeRentableTenants = tenants.filter(
      (t) => !t.outDate && rentableUnitIds.has(t.unitId)
    );
    const totalUnits = rentableUnits.length;
    const roomUnitsCount = rentableUnits.filter((u) => u.type === 'room').length;
    const shopUnitsCount = rentableUnits.filter((u) => u.type === 'shop').length;
    const familyUnitsCount = familyUnitsAll.length;
    const occupiedCount = activeRentableTenants.length;
    const vacantCount = Math.max(0, totalUnits - occupiedCount);
    const expectedRent = activeRentableTenants.reduce((s, t) => s + Number(t.rent || 0), 0);
    const totalPaid = rentableBills.reduce((s, b) => s + Number(b.paidAmount || 0), 0);
    const totalDue = rentableBills.reduce((s, b) => s + Number(b.dueAmount || 0), 0);
    const dueUnitsCount = rentableUnits.filter((u) => (dueByUnit.get(u.id) || 0) > 0).length;

    return {
      totalUnits,
      roomUnitsCount,
      shopUnitsCount,
      familyUnitsCount,
      occupiedCount,
      vacantCount,
      expectedRent,
      totalPaid,
      totalDue,
      dueUnitsCount,
    };
  }, [rentableUnits, familyUnitsAll, rentableUnitIds, tenants, rentableBills, dueByUnit]);

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return units.filter((unit) => {
      const tenant = activeTenantsByUnit.get(unit.id);
      const due = dueByUnit.get(unit.id) || 0;
      const isFamily = unit.type === 'family';

      if (filter === 'room' && unit.type !== 'room') return false;
      if (filter === 'shop' && unit.type !== 'shop') return false;
      if (filter === 'family' && !isFamily) return false;
      if (filter === 'occupied' && (isFamily || !tenant)) return false;
      if (filter === 'vacant' && (isFamily || Boolean(tenant))) return false;
      if (filter === 'due' && (isFamily || due <= 0)) return false;
      if (filter === 'unpaid_month' && (isFamily || !unpaidCurrentMonthMap.has(unit.id))) {
        return false;
      }

      if (q) {
        const matchUnit = unit.name.toLowerCase().includes(q) || unit.floor.toLowerCase().includes(q);
        const matchTenant =
          tenant &&
          (tenant.name.toLowerCase().includes(q) || tenant.phone.toLowerCase().includes(q));
        return matchUnit || Boolean(matchTenant);
      }
      return true;
    });
  }, [units, filter, searchQuery, activeTenantsByUnit, dueByUnit, unpaidCurrentMonthMap]);

  const shops = useMemo(() => filteredUnits.filter((u) => u.type === 'shop'), [filteredUnits]);
  const rooms = useMemo(() => filteredUnits.filter((u) => u.type === 'room'), [filteredUnits]);
  const familyRooms = useMemo(
    () => filteredUnits.filter((u) => u.type === 'family'),
    [filteredUnits]
  );

  const filterButtons: Array<{ key: UnitFilter; label: string }> = [
    { key: 'all', label: `সব (${units.length})` },
    { key: 'room', label: `ভাড়ার রুম (${stats.roomUnitsCount})` },
    { key: 'shop', label: `দোকান (${stats.shopUnitsCount})` },
    { key: 'family', label: `পারিবারিক (${stats.familyUnitsCount})` },
    { key: 'occupied', label: 'ভাড়া দেওয়া' },
    { key: 'vacant', label: 'খালি' },
    { key: 'due', label: 'বকেয়া' },
    { key: 'unpaid_month', label: `চলতি মাস বাকি (${unpaidCurrentMonthList.length})` },
  ];

  const previewItems = bannerExpanded
    ? unpaidCurrentMonthList
    : unpaidCurrentMonthList.slice(0, 4);

  const showFamilyEmptyCard =
    (filter === 'all' || filter === 'family') &&
    familyUnitsAll.length === 0 &&
    !searchQuery.trim();

  const hasVisibleResults =
    shops.length > 0 || rooms.length > 0 || familyRooms.length > 0 || showFamilyEmptyCard;

  const handleStatusOptionChange = async (
    unit: Unit,
    currentStatus: UnitStatusOption,
    nextStatus: UnitStatusOption
  ) => {
    if (nextStatus === currentStatus) return;

    if (nextStatus === 'fillup') {
      if (currentStatus === 'family' && onToggleFamilyCategory) {
        await onToggleFamilyCategory(unit, 'room');
      }
      if (onAssignTenant) {
        onAssignTenant(unit.id);
      } else {
        onOpenUnitDetail(unit.id);
      }
      return;
    }

    if (nextStatus === 'empty') {
      if (currentStatus === 'family' && onToggleFamilyCategory) {
        await onToggleFamilyCategory(unit, 'room');
      } else if (currentStatus === 'fillup') {
        if (onVacateUnit) {
          onVacateUnit(unit);
        } else {
          onOpenUnitDetail(unit.id);
        }
      }
      return;
    }

    if (nextStatus === 'family' && onToggleFamilyCategory) {
      await onToggleFamilyCategory(unit, 'family');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Month Unpaid Rent Notification Banner */}
      {!bannerDismissed && unpaidCurrentMonthList.length > 0 && (
        <section
          aria-label="চলতি মাসের অপরিশোধিত ভাড়ার নোটিফিকেশন"
          className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm sm:text-base text-slate-900">
                  {formatBanglaMonth(currentMonth)} মাসের ভাড়া বাকি নোটিফিকেশন
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                  মোট <strong className="font-num text-amber-900">{unpaidCurrentMonthList.length}</strong>{' '}
                  জন ভাড়াটিয়া এখনো চলতি মাসের ভাড়া সম্পূর্ণ পরিশোধ করেননি।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setFilter(filter === 'unpaid_month' ? 'all' : 'unpaid_month')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-xs font-bold text-amber-900 transition-colors whitespace-nowrap"
              >
                {filter === 'unpaid_month' ? 'সব ইউনিট দেখুন' : 'তালিকা ফিল্টার করুন'}
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                aria-label="নোটিফিকেশন বন্ধ করুন"
                className="w-9 h-9 rounded-xl text-slate-500 hover:bg-amber-100 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {previewItems.map(({ unit, tenant, reason, currentMonthDue }) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => onOpenUnitDetail(unit.id)}
                className="text-left min-h-[56px] bg-white hover:border-amber-400 border border-amber-200/90 rounded-xl p-3 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {unit.name} · {tenant.name}
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium mt-0.5 truncate">
                    {reason === 'no_bill'
                      ? 'এই মাসের বিল এখনো হয়নি'
                      : reason === 'partial_due'
                        ? 'আংশিক পরিশোধ · বকেয়া আছে'
                        : 'বিল অপরিশোধিত'}
                  </div>
                </div>
                <span className="font-num font-bold text-xs text-rose-700 shrink-0">
                  {formatBDT(currentMonthDue)}
                </span>
              </button>
            ))}
          </div>

          {unpaidCurrentMonthList.length > 4 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setBannerExpanded((prev) => !prev)}
                className="min-h-[36px] px-3 py-1 text-xs font-bold text-amber-900 hover:underline inline-flex items-center gap-1"
              >
                {bannerExpanded ? (
                  <>
                    সংক্ষিপ্ত করুন <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    আরও {unpaidCurrentMonthList.length - 4} জন দেখুন <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4 Summary KPI Cards (Rentable Units Only) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">ভাড়ার ইউনিট</span>
            <DoorOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold font-num text-slate-900">{stats.totalUnits}</span>
            <span className="text-xs text-slate-400 font-num">
              {stats.roomUnitsCount} রুম · {stats.shopUnitsCount} দোকান
            </span>
          </div>
          <div className="text-xs mt-1.5 text-slate-600 font-medium flex flex-wrap items-center gap-x-1.5">
            <span className="text-emerald-700">{stats.occupiedCount} ভাড়া</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-700">{stats.vacantCount} খালি</span>
            {stats.familyUnitsCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-indigo-700 font-num">{stats.familyUnitsCount} পরিবার</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">মাসিক নির্ধারিত ভাড়া</span>
            <Home className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-num text-slate-900">
            {formatBDT(stats.expectedRent)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">ভাড়াটিয়াদের রুম ও দোকানের মূল ভাড়া</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">সর্বমোট আদায়</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-num text-emerald-700">
            {formatBDT(stats.totalPaid)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">পরিশোধিত ভাড়া ও বিদ্যুৎ বিল</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">সর্বমোট বকেয়া</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-num text-rose-600">
            {formatBDT(stats.totalDue)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{stats.dueUnitsCount}টি ভাড়ার ইউনিটে বকেয়া</p>
        </div>
      </div>

      {/* Current Month Collected vs Pending Dues Chart (Rentable Units Only) */}
      <MonthlyCollectionChart
        bills={rentableBills}
        units={rentableUnits}
        onCreateBill={onNewBill}
      />

      {/* Filter, View Mode, Family Selector & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {filterButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setFilter(btn.key)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filter === btn.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Card vs Excel-Style Table View Switcher */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> কার্ড
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" /> টেবিল (শিট ভিউ)
              </button>
            </div>

            {onExportExcel && (
              <button
                type="button"
                onClick={() => void onExportExcel()}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
              </button>
            )}
            <button
              type="button"
              onClick={onManageFamilyRooms}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Home className="w-4 h-4" /> পারিবারিক রুম
            </button>

            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="রুম, দোকান, নাম বা মোবাইল..."
                className="w-full min-h-[42px] pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Empty Search Fallback */}
      {!hasVisibleResults && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">কোনো রুম বা দোকান পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500">ফিল্টার পরিবর্তন করে বা অন্য নামে সার্চ করে দেখুন।</p>
        </div>
      )}

      {/* Excel-Style Interactive Table View (খালি = সব ঘর ফাঁকা, Fillup = সব বিস্তারিত) */}
      {viewMode === 'table' && hasVisibleResults && (shops.length > 0 || rooms.length > 0) && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Table2 className="w-4 h-4 text-emerald-400" />
                <span>রুম ও দোকানের তালিকা (খালি / ভাড়া আছে অপশন)</span>
              </h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                &ldquo;খালি&rdquo; থাকলে ঐ রুমের সব ঘর ফাঁকা থাকবে · &ldquo;ভাড়া আছে (Fillup)&rdquo; দিলে তথ্য যোগ/দেখা যাবে
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs border-b border-slate-200">
                  <th className="py-2.5 px-3 font-bold text-center w-12">নং</th>
                  <th className="py-2.5 px-3 font-bold">রুম / দোকান</th>
                  <th className="py-2.5 px-3 font-bold">ফ্লোর</th>
                  <th className="py-2.5 px-3 font-bold w-48">অবস্থা (অপশন)</th>
                  <th className="py-2.5 px-3 font-bold">ভাড়াটিয়ার নাম</th>
                  <th className="py-2.5 px-3 font-bold">মোবাইল</th>
                  <th className="py-2.5 px-3 font-bold text-right">মাসিক ভাড়া (৳)</th>
                  <th className="py-2.5 px-3 font-bold text-right">মোট বকেয়া (৳)</th>
                  <th className="py-2.5 px-3 font-bold text-center">কাজ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {[...shops, ...rooms].map((unit, idx) => {
                  const tenant = activeTenantsByUnit.get(unit.id);
                  const due = dueByUnit.get(unit.id) || 0;
                  const statusValue: UnitStatusOption = tenant ? 'fillup' : 'empty';

                  return (
                    <tr
                      key={unit.id}
                      className={tenant ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/40 hover:bg-amber-50/30'}
                    >
                      <td className="py-2.5 px-3 text-center font-num text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {unit.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {tenant ? unit.floor : ''}
                      </td>
                      <td className="py-2 px-3">
                        <select
                          aria-label={`${unit.name} অবস্থা`}
                          value={statusValue}
                          onChange={(e) =>
                            void handleStatusOptionChange(
                              unit,
                              statusValue,
                              e.target.value as UnitStatusOption
                            )
                          }
                          className={`w-full min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                            tenant
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          <option value="empty">খালি</option>
                          <option value="fillup">ভাড়া আছে (Fillup)</option>
                          {unit.type !== 'shop' && <option value="family">পারিবারিক</option>}
                        </select>
                      </td>
                      {/* When খালি, ALL detail cells remain completely EMPTY */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {tenant ? tenant.name : ''}
                      </td>
                      <td className="py-2.5 px-3 font-num text-slate-600">
                        {tenant ? tenant.phone : ''}
                      </td>
                      <td className="py-2.5 px-3 font-num font-bold text-slate-900 text-right">
                        {tenant ? formatBDT(tenant.rent) : ''}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-num font-bold text-right ${
                          tenant && due > 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {tenant ? formatBDT(due) : ''}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            tenant
                              ? onOpenUnitDetail(unit.id)
                              : onAssignTenant
                                ? onAssignTenant(unit.id)
                                : onOpenUnitDetail(unit.id)
                          }
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                            tenant
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {tenant ? 'বিস্তারিত' : '+ Fillup করুন'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Commercial Shops Section (Card View) */}
      {viewMode === 'cards' && shops.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-600" />
              <span>দোকান সমূহ ({shops.length}টি)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shops.map((shop) => {
              const tenant = activeTenantsByUnit.get(shop.id);
              const due = dueByUnit.get(shop.id) || 0;
              const unpaidCurrent = unpaidCurrentMonthMap.get(shop.id);
              const statusValue: UnitStatusOption = tenant ? 'fillup' : 'empty';

              const borderClass =
                due > 0
                  ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
                  : unpaidCurrent
                    ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                    : tenant
                      ? 'border-slate-200 bg-white hover:border-emerald-500'
                      : 'border-dashed border-slate-300 bg-white hover:border-amber-500';

              return (
                <div
                  key={shop.id}
                  onClick={() => onOpenUnitDetail(shop.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenUnitDetail(shop.id);
                    }
                  }}
                  className={`cursor-pointer text-left w-full rounded-2xl border p-4 transition flex items-center justify-between gap-4 min-h-[88px] ${borderClass}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {tenant?.passportImg ? (
                      <img
                        src={tenant.passportImg}
                        alt={tenant.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          tenant ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Store className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">{shop.name}</span>
                        <select
                          aria-label={`${shop.name} অবস্থা`}
                          value={statusValue}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            void handleStatusOptionChange(
                              shop,
                              statusValue,
                              e.target.value as UnitStatusOption
                            );
                          }}
                          className={`min-h-[28px] px-2 py-0.5 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                            tenant
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          <option value="empty">খালি</option>
                          <option value="fillup">ভাড়া আছে (Fillup)</option>
                        </select>
                      </div>
                      {tenant ? (
                        <>
                          <p className="text-sm font-medium text-slate-700 truncate mt-0.5">
                            {tenant.name}
                          </p>
                          <p className="text-xs text-slate-500 font-num truncate">{tenant.phone}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">সব ঘর খালি</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {tenant ? (
                      <>
                        <span className="font-num font-bold text-sm text-slate-900 block">
                          {formatBDT(tenant.rent)}
                        </span>
                        {due > 0 ? (
                          <span className="text-xs font-num font-bold text-rose-600 block mt-1">
                            বকেয়া: {formatBDT(due)}
                          </span>
                        ) : unpaidCurrent ? (
                          <span className="text-xs font-semibold text-amber-800 block mt-1">
                            বিল বাকি
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 block mt-1">ক্লিয়ার</span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 block">+ Fillup করুন</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Residential Tenant Rooms Section (Card View) */}
      {viewMode === 'cards' && rooms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-slate-600" />
              <span>ভাড়াটিয়াদের আবাসিক রুম ({rooms.length}টি)</span>
            </h2>
            <span className="text-xs text-slate-500 hidden sm:inline">
              রুম থেকে সরাসরি &ldquo;খালি / ভাড়া আছে&rdquo; অপশন নির্বাচন করুন
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {rooms.map((room) => {
              const tenant = activeTenantsByUnit.get(room.id);
              const due = dueByUnit.get(room.id) || 0;
              const unpaidCurrent = unpaidCurrentMonthMap.get(room.id);
              const statusValue: UnitStatusOption = tenant ? 'fillup' : 'empty';

              let cardClass = 'border-dashed border-slate-300 bg-white hover:border-amber-500';
              if (tenant) {
                if (due > 0) {
                  cardClass = 'border-rose-300 bg-rose-50/30 hover:border-rose-400';
                } else if (unpaidCurrent) {
                  cardClass = 'border-amber-300 bg-amber-50/30 hover:border-amber-400';
                } else {
                  cardClass = 'border-slate-200 bg-white hover:border-emerald-500';
                }
              }

              return (
                <div
                  key={room.id}
                  onClick={() => onOpenUnitDetail(room.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenUnitDetail(room.id);
                    }
                  }}
                  className={`cursor-pointer text-left rounded-2xl border p-3.5 transition flex flex-col justify-between gap-2.5 ${cardClass}`}
                >
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <span className="font-bold text-sm text-slate-900 truncate">{room.name}</span>
                    <select
                      aria-label={`${room.name} অবস্থা`}
                      value={statusValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        void handleStatusOptionChange(
                          room,
                          statusValue,
                          e.target.value as UnitStatusOption
                        );
                      }}
                      className={`max-w-[110px] min-h-[28px] px-1.5 py-0.5 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                        tenant
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <option value="empty">খালি</option>
                      <option value="fillup">ভাড়া আছে</option>
                      <option value="family">পারিবারিক</option>
                    </select>
                  </div>

                  {tenant ? (
                    <>
                      <div className="flex items-center gap-2.5 w-full min-w-0">
                        {tenant.passportImg ? (
                          <img
                            src={tenant.passportImg}
                            alt={tenant.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{tenant.name}</div>
                          <div className="text-xs text-slate-500 font-num truncate">{tenant.phone}</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between w-full text-xs">
                        <span className="font-num font-bold text-slate-800">
                          {formatBDT(tenant.rent)}
                        </span>
                        {due > 0 ? (
                          <span className="font-num font-bold text-rose-600">-{formatBDT(due)}</span>
                        ) : unpaidCurrent ? (
                          <span className="text-amber-800 font-semibold">বাকি</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">ক্লিয়ার</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Empty room: all detail cells stay blank/empty */}
                      <div className="flex items-center gap-2.5 w-full min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="h-3.5 text-xs text-slate-400 truncate">সব ঘর খালি</div>
                          <div className="h-3 text-[11px] text-slate-300 truncate">&nbsp;</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between w-full text-xs">
                        <span className="text-slate-300 font-num">&mdash;</span>
                        <span className="text-emerald-700 font-bold">+ Fillup</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Separate Family Use Rooms Section */}
      {(familyRooms.length > 0 || showFamilyEmptyCard) && (
        <section
          aria-label="নিজেদের পারিবারিক ব্যবহারের রুম"
          className="bg-indigo-50/40 border border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-700" />
                <span>নিজেদের / পারিবারিক রুম সমূহ ({familyRooms.length}টি)</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                এই রুমগুলো ভাড়াটিয়াদের রুম ও মাসিক ভাড়ার হিসাব থেকে আলাদা রাখা হয়েছে।
              </p>
            </div>
            <button
              type="button"
              onClick={onManageFamilyRooms}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              রুম নির্বাচন / পরিবর্তন
            </button>
          </div>

          {familyRooms.length === 0 ? (
            <div className="bg-white border border-dashed border-indigo-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  এখনো কোনো পারিবারিক রুম আলাদা করা হয়নি
                </p>
                <p className="text-xs text-slate-500">
                  আপনাদের নিজেদের ব্যবহারের রুমগুলো সিলেক্ট করলে সেগুলো ভাড়াটিয়ার হিসাব থেকে সরে এই বিভাগে থাকবে।
                </p>
              </div>
              <button
                type="button"
                onClick={onManageFamilyRooms}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold whitespace-nowrap shrink-0"
              >
                পারিবারিক রুম নির্বাচন করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {familyRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onOpenUnitDetail(room.id)}
                  className="text-left rounded-2xl border border-indigo-200 bg-white hover:border-indigo-400 p-3.5 transition flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="font-bold text-sm text-slate-900 truncate">{room.name}</span>
                    <span className="text-xs font-semibold text-indigo-700 shrink-0">পারিবারিক</span>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                      <Home className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">নিজেদের ব্যবহার</div>
                      <div className="text-xs text-slate-500 truncate">{room.floor}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between w-full text-xs text-slate-500">
                    <span>হিসাবের বাইরে</span>
                    <span className="text-indigo-700 font-semibold">পরিবর্তন</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
