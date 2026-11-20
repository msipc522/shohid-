import React, { useMemo, useState } from 'react';
import { CheckCircle2, Edit2, FileSpreadsheet, Plus, Receipt, RotateCcw, Trash2, Zap } from 'lucide-react';
import { Bill, Tenant, Unit } from '../types';
import { formatBanglaMonth, formatBDT } from '../utils/formatters';

interface BillingTabProps {
  units: Unit[];
  tenants: Tenant[];
  bills: Bill[];
  onNewBill: () => void;
  onEditBill: (bill: Bill) => void;
  onMarkBillPaid: (bill: Bill) => Promise<void>;
  onDeleteBill: (bill: Bill) => void;
  onOpenReceipt: (bill: Bill) => void;
  onExportExcel?: () => Promise<void>;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  units,
  tenants,
  bills,
  onNewBill,
  onEditBill,
  onMarkBillPaid,
  onDeleteBill,
  onOpenReceipt,
  onExportExcel,
}) => {
  const [unitFilter, setUnitFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'due'>('all');
  const [markingBillId, setMarkingBillId] = useState<string | null>(null);

  const handleMarkPaid = async (bill: Bill) => {
    setMarkingBillId(bill.id);
    try {
      await onMarkBillPaid(bill);
    } finally {
      setMarkingBillId(null);
    }
  };

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const tenantMap = useMemo(() => new Map(tenants.map((t) => [t.id, t])), [tenants]);
  const activeTenantByUnit = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const t of tenants) {
      if (!t.outDate) map.set(t.unitId, t);
    }
    return map;
  }, [tenants]);

  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => {
        if (unitFilter !== 'all' && b.unitId !== unitFilter) return false;
        if (monthFilter && b.month !== monthFilter) return false;
        if (statusFilter === 'paid' && b.dueAmount > 0) return false;
        if (statusFilter === 'due' && b.dueAmount <= 0) return false;
        return true;
      })
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [bills, unitFilter, monthFilter, statusFilter]);

  const resetFilters = () => {
    setUnitFilter('all');
    setMonthFilter('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-5">
      {/* Filter & New Bill Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
          >
            <option value="all">সকল রুম ও দোকান</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-num"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'due')}
            className="min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
          >
            <option value="all">সকল স্ট্যাটাস</option>
            <option value="paid">পরিশোধিত (Paid)</option>
            <option value="due">বকেয়া আছে (Due)</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> রিসেট
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onExportExcel && (
            <button
              type="button"
              onClick={() => void onExportExcel()}
              className="min-h-[44px] bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
            </button>
          )}
          <button
            type="button"
            onClick={onNewBill}
            className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Zap className="w-4 h-4" /> নতুন মাসিক বিল যোগ করুন
          </button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filteredBills.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">কোনো বিলের হিসাব পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500">
              নতুন মাসের ভাড়া ও বিদ্যুৎ মিটারের রিডিং যোগ করতে নিচের বাটনে ক্লিক করুন।
            </p>
            <button
              type="button"
              onClick={onNewBill}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" /> প্রথম বিল তৈরি করুন
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                  <th className="py-3.5 px-4 font-semibold">মাস</th>
                  <th className="py-3.5 px-4 font-semibold">রুম/দোকান ও ভাড়াটিয়া</th>
                  <th className="py-3.5 px-4 font-semibold">বিদ্যুৎ ইউনিট</th>
                  <th className="py-3.5 px-4 font-semibold">ভাড়া + বিদ্যুৎ + চার্জ</th>
                  <th className="py-3.5 px-4 font-semibold text-right">মোট বিল</th>
                  <th className="py-3.5 px-4 font-semibold text-right">জমা (Paid)</th>
                  <th className="py-3.5 px-4 font-semibold text-right">বকেয়া (Due)</th>
                  <th className="py-3.5 px-4 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBills.map((b) => {
                  const unit = unitMap.get(b.unitId);
                  const tenant = tenantMap.get(b.tenantId) || activeTenantByUnit.get(b.unitId);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {formatBanglaMonth(b.month)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{unit?.name || '-'}</div>
                        <div className="text-xs text-slate-500">{tenant?.name || 'ভাড়াটিয়া'}</div>
                      </td>
                      <td className="py-3 px-4 font-num text-xs whitespace-nowrap text-slate-700">
                        <div>
                          {b.prevReading} → {b.currReading}
                        </div>
                        <div className="text-amber-700 font-bold">
                          {b.consumedUnits} U (৳{b.unitRate}/U)
                        </div>
                      </td>
                      <td className="py-3 px-4 font-num text-xs whitespace-nowrap text-slate-600">
                        <div>ভাড়া: {formatBDT(b.baseRent)}</div>
                        <div>
                          বিদ্যুৎ: {formatBDT(b.elecBill)} · অন্য: {formatBDT(b.otherCharge)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-num font-bold text-slate-900 text-right whitespace-nowrap">
                        {formatBDT(b.totalPayable)}
                      </td>
                      <td className="py-3 px-4 font-num font-bold text-emerald-700 text-right whitespace-nowrap">
                        {formatBDT(b.paidAmount)}
                      </td>
                      <td
                        className={`py-3 px-4 font-num font-bold text-right whitespace-nowrap ${
                          b.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatBDT(b.dueAmount)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {b.dueAmount > 0 ? (
                            <button
                              type="button"
                              disabled={markingBillId === b.id}
                              onClick={() => void handleMarkPaid(b)}
                              title="সম্পূর্ণ বিল পরিশোধ (Paid) করুন"
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{markingBillId === b.id ? '...' : 'Paid'}</span>
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 px-2 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ক্লিয়ার
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenReceipt(b)}
                            title="রশিদ দেখুন"
                            className="min-w-[38px] min-h-[38px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditBill(b)}
                            title="এডিট করুন"
                            className="min-w-[38px] min-h-[38px] rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 inline-flex items-center justify-center"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBill(b)}
                            title="মুছুন"
                            className="min-w-[38px] min-h-[38px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
