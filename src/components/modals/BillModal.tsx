import React, { useEffect, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { Bill, PayMethod, Tenant, Unit } from '../../types';
import { formatBDT } from '../../utils/formatters';

interface BillModalProps {
  isOpen: boolean;
  editingBill: Bill | null;
  preselectUnitId: string | null;
  defaultUnitRate: number;
  units: Unit[];
  tenants: Tenant[];
  bills: Bill[];
  onClose: () => void;
  onSave: (bill: Bill, isNew: boolean) => Promise<void>;
  onNotify: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  editingBill,
  preselectUnitId,
  defaultUnitRate,
  units,
  tenants,
  bills,
  onClose,
  onSave,
  onNotify,
}) => {
  const [unitId, setUnitId] = useState('');
  const [month, setMonth] = useState('');
  const [unitRate, setUnitRate] = useState('10');
  const [prevReading, setPrevReading] = useState('0');
  const [currReading, setCurrReading] = useState('0');
  const [baseRent, setBaseRent] = useState('0');
  const [otherCharge, setOtherCharge] = useState('0');
  const [prevDue, setPrevDue] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [payMethod, setPayMethod] = useState<PayMethod>('Cash');
  const [payDate, setPayDate] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDefaultsForUnit = (selectedUnitId: string) => {
    const unit = units.find((u) => u.id === selectedUnitId);
    const activeTenant = tenants.find((t) => t.unitId === selectedUnitId && !t.outDate);
    setBaseRent(String(activeTenant ? activeTenant.rent : unit?.defaultRent || 0));

    const unitBills = bills
      .filter((b) => b.unitId === selectedUnitId)
      .sort((a, b) => b.month.localeCompare(a.month));

    if (unitBills.length > 0) {
      const last = unitBills[0];
      setPrevReading(String(last.currReading || 0));
      setCurrReading(String(last.currReading || 0));
      setPrevDue(String(last.dueAmount || 0));
    } else {
      const initMeter = activeTenant ? activeTenant.initialMeter || 0 : 0;
      setPrevReading(String(initMeter));
      setCurrReading(String(initMeter));
      setPrevDue('0');
    }
    setPaidAmount('0');
  };

  useEffect(() => {
    if (!isOpen) return;
    if (editingBill) {
      setUnitId(editingBill.unitId);
      setMonth(editingBill.month);
      setUnitRate(String(editingBill.unitRate));
      setPrevReading(String(editingBill.prevReading));
      setCurrReading(String(editingBill.currReading));
      setBaseRent(String(editingBill.baseRent));
      setOtherCharge(String(editingBill.otherCharge));
      setPrevDue(String(editingBill.prevDue));
      setPaidAmount(String(editingBill.paidAmount));
      setPayMethod(editingBill.payMethod || 'Cash');
      setPayDate(editingBill.payDate || new Date().toISOString().slice(0, 10));
    } else {
      const rentableUnits = units.filter((u) => u.type !== 'family');
      const initialUnitId = preselectUnitId || rentableUnits[0]?.id || units[0]?.id || '';
      setUnitId(initialUnitId);
      setMonth(new Date().toISOString().slice(0, 7));
      setPayDate(new Date().toISOString().slice(0, 10));
      setUnitRate(String(defaultUnitRate || 10));
      setOtherCharge('0');
      setPayMethod('Cash');
      if (initialUnitId) {
        loadDefaultsForUnit(initialUnitId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingBill, preselectUnitId]);

  if (!isOpen) return null;

  const prev = parseFloat(prevReading) || 0;
  const curr = parseFloat(currReading) || 0;
  const rate = parseFloat(unitRate) || 0;
  const consumedUnits = Math.max(0, curr - prev);
  const elecBill = Math.round(consumedUnits * rate);
  const rentNum = parseFloat(baseRent) || 0;
  const otherNum = parseFloat(otherCharge) || 0;
  const prevDueNum = parseFloat(prevDue) || 0;
  const totalPayable = rentNum + elecBill + otherNum + prevDueNum;
  const paidNum = parseFloat(paidAmount) || 0;
  const dueAmount = Math.max(0, totalPayable - paidNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (curr < prev) {
      onNotify('বর্তমান ইউনিট পূর্ববর্তী ইউনিটের চেয়ে কম হতে পারে না!', 'error');
      return;
    }

    setSaving(true);
    try {
      const activeTenant = tenants.find((t) => t.unitId === unitId && !t.outDate);
      const payload: Bill = {
        id: editingBill?.id || `bill_${Date.now()}`,
        ownerUid: editingBill?.ownerUid || '',
        unitId,
        tenantId: editingBill?.tenantId || activeTenant?.id || '',
        month,
        prevReading: prev,
        currReading: curr,
        unitRate: rate,
        consumedUnits: Number(consumedUnits.toFixed(2)),
        baseRent: rentNum,
        elecBill,
        otherCharge: otherNum,
        prevDue: prevDueNum,
        totalPayable,
        paidAmount: paidNum,
        dueAmount,
        payMethod,
        payDate,
      };
      await onSave(payload, !editingBill);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-200">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <h3 className="font-bold text-lg">
            {editingBill ? 'বিল ও পেমেন্ট আপডেট' : 'নতুন মাসিক বিল তৈরি করুন'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">রুম / দোকান নির্বাচন *</label>
              <select
                value={unitId}
                onChange={(e) => {
                  setUnitId(e.target.value);
                  if (!editingBill) loadDefaultsForUnit(e.target.value);
                }}
                required
                className="w-full min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold"
              >
                {units
                  .filter(
                    (u) =>
                      u.type !== 'family' ||
                      u.id === editingBill?.unitId ||
                      u.id === preselectUnitId
                  )
                  .map((u) => {
                    const t = tenants.find((item) => item.unitId === u.id && !item.outDate);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.type === 'family' ? '(পারিবারিক)' : t ? `- ${t.name}` : '(খালি)'}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বিলের মাস *</label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-num"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> বিদ্যুৎ মিটার রিডিং
              </span>
              <div className="flex items-center gap-1.5">
                <span>প্রতি ইউনিট (৳):</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={unitRate}
                  onChange={(e) => setUnitRate(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-amber-300 rounded text-center font-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">পূর্ববর্তী ইউনিট</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={prevReading}
                  onChange={(e) => setPrevReading(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-num"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">বর্তমান ইউনিট</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={currReading}
                  onChange={(e) => setCurrReading(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-num"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">ব্যবহৃত ইউনিট</label>
                <input
                  type="text"
                  readOnly
                  value={consumedUnits.toFixed(1).replace(/\.0$/, '')}
                  className="w-full min-h-[38px] px-2.5 py-1.5 bg-amber-100 border border-amber-300 rounded-lg text-sm font-num font-bold text-amber-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">রুম/দোকান ভাড়া</label>
              <input
                type="number"
                min="0"
                required
                value={baseRent}
                onChange={(e) => setBaseRent(e.target.value)}
                className="w-full min-h-[40px] px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-num font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">বিদ্যুৎ বিল (৳)</label>
              <input
                type="number"
                readOnly
                value={elecBill}
                className="w-full min-h-[40px] px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-num font-bold text-amber-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">সার্ভিস চার্জ (৳)</label>
              <input
                type="number"
                min="0"
                value={otherCharge}
                onChange={(e) => setOtherCharge(e.target.value)}
                className="w-full min-h-[40px] px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-num"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-rose-600 mb-1">পূর্বের বকেয়া (৳)</label>
              <input
                type="number"
                min="0"
                value={prevDue}
                onChange={(e) => setPrevDue(e.target.value)}
                className="w-full min-h-[40px] px-2.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-sm font-num text-rose-700"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-sm font-bold text-slate-700">সর্বমোট বিল:</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-num text-slate-900">{formatBDT(totalPayable)}</span>
                <button
                  type="button"
                  onClick={() => setPaidAmount(String(totalPayable))}
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap"
                >
                  Paid (সম্পূর্ণ জমা)
                </button>
                {paidNum > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaidAmount('0')}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap"
                  >
                    বাকি রাখুন
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-1">জমা টাকা / Paid (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 bg-white border-2 border-emerald-500 rounded-xl text-sm font-num font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-700 mb-1">বর্তমান বকেয়া / Due (৳)</label>
                <input
                  type="text"
                  readOnly
                  value={dueAmount}
                  className="w-full min-h-[40px] px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-sm font-num font-bold text-rose-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PayMethod)}
                  className="w-full min-h-[38px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="Cash">নগদ (Cash)</option>
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                  <option value="Bank">ব্যাংক (Bank)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">পেমেন্ট তারিখ</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full min-h-[38px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-num"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold"
            >
              {saving ? 'সেভ হচ্ছে...' : 'বিল সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
