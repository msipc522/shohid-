import React from 'react';
import { Printer, X } from 'lucide-react';
import { Bill, HouseSettings, Tenant, Unit } from '../../types';
import { formatBanglaMonth, formatBDT } from '../../utils/formatters';

interface ReceiptModalProps {
  bill: Bill | null;
  settings: HouseSettings;
  units: Unit[];
  tenants: Tenant[];
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  bill,
  settings,
  units,
  tenants,
  onClose,
}) => {
  if (!bill) return null;

  const unit = units.find((u) => u.id === bill.unitId);
  const tenant =
    tenants.find((t) => t.id === bill.tenantId) ||
    tenants.find((t) => t.unitId === bill.unitId && !t.outDate);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/75 z-[70] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="receipt-print-area"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto border border-slate-200"
      >
        <div className="bg-slate-900 text-white p-5 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="no-print absolute right-4 top-4 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-xs font-semibold text-emerald-400 mb-1">ভাড়ার রশিদ / RENT RECEIPT</p>
          <h3 className="text-xl font-bold">{settings.houseName}</h3>
          <p className="text-xs text-slate-300 mt-0.5">{settings.houseAddress}</p>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div className="flex justify-between items-start border-b border-dashed border-slate-300 pb-3">
            <div>
              <span className="text-xs text-slate-500 block">ভাড়াটিয়া ও ইউনিট:</span>
              <strong className="text-base text-slate-900 block">
                {tenant?.name || 'ভাড়াটিয়া'}
              </strong>
              <span className="text-xs font-bold text-emerald-700">{unit?.name || '-'}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">বিলের মাস:</span>
              <strong className="text-base font-num text-slate-900 block">
                {formatBanglaMonth(bill.month)}
              </strong>
              <span className="text-xs text-slate-500 font-num">তারিখ: {bill.payDate || '-'}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between text-xs">
            <div>
              <span className="text-slate-500 block">পূর্ববর্তী:</span>
              <strong className="font-num">{bill.prevReading}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">বর্তমান:</span>
              <strong className="font-num">{bill.currReading}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ব্যবহৃত:</span>
              <strong className="font-num text-amber-700">{bill.consumedUnits} U</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">রেট:</span>
              <strong className="font-num">৳{bill.unitRate}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>মাসিক ভাড়া</span>
              <span className="font-num font-semibold">{formatBDT(bill.baseRent)}</span>
            </div>
            <div className="flex justify-between">
              <span>বিদ্যুৎ বিল</span>
              <span className="font-num font-semibold">{formatBDT(bill.elecBill)}</span>
            </div>
            <div className="flex justify-between">
              <span>সার্ভিস চার্জ</span>
              <span className="font-num font-semibold">{formatBDT(bill.otherCharge)}</span>
            </div>
            <div className="flex justify-between">
              <span>পূর্বের বকেয়া</span>
              <span className="font-num font-semibold text-rose-600">{formatBDT(bill.prevDue)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <span>সর্বমোট বিল</span>
              <span className="font-num">{formatBDT(bill.totalPayable)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>জমা (Paid · {bill.payMethod})</span>
              <span className="font-num">{formatBDT(bill.paidAmount)}</span>
            </div>
            <div className="flex justify-between bg-rose-50 p-2.5 rounded-xl text-rose-700 font-bold">
              <span>বর্তমান বকেয়া (Due)</span>
              <span className="font-num">{formatBDT(bill.dueAmount)}</span>
            </div>
          </div>

          <div className="no-print pt-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 min-h-[42px] bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> প্রিন্ট / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm"
            >
              বন্ধ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
