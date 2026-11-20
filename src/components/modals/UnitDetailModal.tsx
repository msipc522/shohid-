import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Camera,
  Check,
  CheckCircle2,
  DoorOpen,
  Edit2,
  FolderOpen,
  Home,
  Phone,
  Receipt,
  Store,
  User,
  UserPlus,
  Users,
  X,
  Zap,
  ZoomIn,
} from 'lucide-react';
import { Bill, Tenant, Unit, UnitType } from '../../types';
import { formatBanglaMonth, formatBDT } from '../../utils/formatters';

interface UnitDetailModalProps {
  unit: Unit | null;
  tenants: Tenant[];
  bills: Bill[];
  onClose: () => void;
  onEditUnit: (unit: Unit) => void;
  onToggleFamilyCategory: (unit: Unit, nextType: UnitType) => Promise<void>;
  onVacateUnit?: (unit: Unit) => void;
  onAssignTenant: (unitId: string) => void;
  onEditTenant: (tenant: Tenant) => void;
  onNewBillForUnit: (unitId: string) => void;
  onMarkBillPaid: (bill: Bill) => Promise<void>;
  onOpenReceipt: (bill: Bill) => void;
  onOpenLightbox: (src: string, title: string) => void;
}

export const UnitDetailModal: React.FC<UnitDetailModalProps> = ({
  unit,
  tenants,
  bills,
  onClose,
  onEditUnit,
  onToggleFamilyCategory,
  onVacateUnit,
  onAssignTenant,
  onEditTenant,
  onNewBillForUnit,
  onMarkBillPaid,
  onOpenReceipt,
  onOpenLightbox,
}) => {
  const [markingBillId, setMarkingBillId] = useState<string | null>(null);

  if (!unit) return null;

  const handleMarkPaid = async (bill: Bill) => {
    setMarkingBillId(bill.id);
    try {
      await onMarkBillPaid(bill);
    } finally {
      setMarkingBillId(null);
    }
  };

  const activeTenant = tenants.find((t) => t.unitId === unit.id && !t.outDate) || null;
  const pastTenants = tenants.filter((t) => t.unitId === unit.id && Boolean(t.outDate));
  const unitBills = bills
    .filter((b) => b.unitId === unit.id)
    .sort((a, b) => b.month.localeCompare(a.month));

  const isFamily = unit.type === 'family';

  const renderDocThumb = (label: string, imgSrc: string) => {
    if (!imgSrc) {
      return (
        <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 text-center flex flex-col items-center justify-center min-h-[110px]">
          <span className="text-xs font-bold text-slate-600">{label}</span>
          <span className="text-[11px] text-slate-400 mt-1">আপলোড করা হয়নি</span>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox(imgSrc, label)}
        className="text-left group border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-emerald-500 transition"
      >
        <div className="h-24 overflow-hidden bg-slate-100 relative">
          <img
            src={imgSrc}
            alt={label}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
          </div>
        </div>
        <div className="p-2 text-xs font-bold text-slate-700 truncate bg-slate-50">{label}</div>
      </button>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0">
              {unit.type === 'shop' ? (
                <Store className="w-5 h-5" />
              ) : isFamily ? (
                <Home className="w-5 h-5 text-indigo-300" />
              ) : (
                <DoorOpen className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <h3 className="font-bold text-base sm:text-lg truncate">
                  {unit.name} ({unit.floor})
                </h3>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span
                  className={
                    isFamily
                      ? 'text-indigo-300 font-semibold'
                      : activeTenant
                        ? 'text-emerald-400 font-semibold'
                        : 'text-amber-400 font-semibold'
                  }
                >
                  {isFamily ? 'পারিবারিক ব্যবহার' : activeTenant ? 'ভাড়া আছে (Fillup)' : 'খালি'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-num mt-0.5">
                {isFamily
                  ? 'ভাড়াটিয়ার হিসাবের বাইরে রাখা হয়েছে'
                  : activeTenant
                    ? `বর্তমান ভাড়া: ${formatBDT(activeTenant.rent)} · অগ্রিম: ${formatBDT(activeTenant.advance)}`
                    : 'সব ঘর খালি আছে · ভাড়া দিলে "ভাড়া আছে (Fillup)" সিলেক্ট করুন'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onEditUnit(unit)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> রুম এডিট
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Room Status Option Bar: খালি vs ভাড়া আছে (Fillup) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">রুমের অবস্থা (অপশন)</div>
              <p className="text-[11px] text-slate-500">
                খালি থাকলে সব ঘর ফাঁকা থাকবে · ভাড়া হলে তথ্য যুক্ত হবে
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={async () => {
                  if (isFamily) {
                    await onToggleFamilyCategory(unit, 'room');
                  } else if (activeTenant && onVacateUnit) {
                    onVacateUnit(unit);
                  }
                }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  !isFamily && !activeTenant
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                খালি
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isFamily) {
                    await onToggleFamilyCategory(unit, 'room');
                  }
                  if (!activeTenant) {
                    onClose();
                    onAssignTenant(unit.id);
                  }
                }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  !isFamily && activeTenant
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ভাড়া আছে (Fillup)
              </button>
              {unit.type !== 'shop' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isFamily) void onToggleFamilyCategory(unit, 'family');
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isFamily ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  পারিবারিক
                </button>
              )}
            </div>
          </div>

          {isFamily ? (
            <div className="text-center py-8 px-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                <Home className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-slate-900">
                এই রুমটি আপনাদের নিজেদের পারিবারিক ব্যবহারে আছে
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                এই রুমটি ভাড়াটিয়াদের রুম, খালি রুম বা মাসিক ভাড়ার হিসাব থেকে আলাদা রাখা হয়েছে। চাইলে যেকোনো সময় আবার ভাড়ার রুমে ফিরিয়ে নিতে পারবেন।
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void onToggleFamilyCategory(unit, 'room')}
                  className="min-h-[42px] bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" /> ভাড়ার রুমে ফিরিয়ে নিন
                </button>
              </div>
            </div>
          ) : !activeTenant ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {['ভাড়াটিয়ার নাম', 'মোবাইল নম্বর', 'মাসিক ভাড়া', 'অগ্রিম / মিটার'].map((label) => (
                  <div
                    key={label}
                    className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3"
                  >
                    <div className="text-[11px] font-semibold text-slate-400">{label}</div>
                    <div className="h-5 mt-1 text-xs text-slate-300" aria-label="খালি ঘর">
                      &nbsp;
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center py-7 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base sm:text-lg text-slate-900">
                  {unit.name} বর্তমানে খালি (সব ঘর ফাঁকা)
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  রুমটি খালি থাকায় কোনো ভাড়া বা ভাড়াটিয়ার তথ্য দেখানো হচ্ছে না। ভাড়া দিলে &ldquo;ভাড়া আছে (Fillup)&rdquo; বাটনে ক্লিক করে তথ্য যুক্ত করুন।
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAssignTenant(unit.id);
                    }}
                    className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> ভাড়া আছে (Fillup) — তথ্য যুক্ত করুন
                  </button>
                  {unit.type === 'room' && (
                    <button
                      type="button"
                      onClick={() => void onToggleFamilyCategory(unit, 'family')}
                      className="min-h-[44px] bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2"
                    >
                      <Home className="w-4 h-4" /> পারিবারিক রুমে সরান
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Active Tenant Profile */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <div className="shrink-0">
                  {activeTenant.passportImg ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenLightbox(activeTenant.passportImg, `পাসপোর্ট ছবি - ${activeTenant.name}`)
                      }
                      className="block rounded-2xl overflow-hidden border border-slate-300"
                    >
                      <img
                        src={activeTenant.passportImg}
                        alt={activeTenant.name}
                        referrerPolicy="no-referrer"
                        className="w-24 h-28 object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-24 h-28 rounded-2xl bg-slate-200 text-slate-500 flex flex-col items-center justify-center">
                      <User className="w-7 h-7" />
                      <span className="text-[11px] mt-1">ছবি নেই</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-lg text-slate-900">{activeTenant.name}</h4>
                      <p className="text-xs text-slate-600">
                        {activeTenant.occupation || 'পেশা উল্লেখ নেই'} · NID:{' '}
                        <span className="font-num font-semibold text-slate-800">
                          {activeTenant.nidNumber || 'নেই'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditTenant(activeTenant);
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> এডিট / ছবি যোগ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNewBillForUnit(unit.id);
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" /> বিল করুন
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-left">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">নিজের মোবাইল</span>
                      <a
                        href={`tel:${activeTenant.phone}`}
                        className="font-num font-bold text-emerald-700 text-sm hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> {activeTenant.phone}
                      </a>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">পরিবারের মোবাইল</span>
                      <a
                        href={`tel:${activeTenant.familyPhone}`}
                        className="font-num font-bold text-slate-800 text-sm hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> {activeTenant.familyPhone || 'দেওয়া হয়নি'}
                      </a>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 sm:col-span-2">
                      <span className="text-slate-500 block text-[11px]">স্থায়ী ঠিকানা</span>
                      <strong className="text-slate-800">
                        {activeTenant.homeAddress || 'দেওয়া হয়নি'}
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between">
                      <div>
                        <span className="text-slate-500 block text-[11px]">ওঠার তারিখ (In)</span>
                        <strong className="font-num text-emerald-700">{activeTenant.inDate || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">ছাড়ার তারিখ (Out)</span>
                        <strong className="font-num text-slate-600">{activeTenant.outDate || 'চলমান'}</strong>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between">
                      <div>
                        <span className="text-slate-500 block text-[11px]">মাসিক ভাড়া</span>
                        <strong className="font-num text-slate-900">{formatBDT(activeTenant.rent)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">অগ্রিম জমা</span>
                        <strong className="font-num text-slate-800">{formatBDT(activeTenant.advance)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Family Members */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" /> সাথে যারা থাকবেন
                </h5>
                {[...(activeTenant.familyStandard || []), ...(activeTenant.familyCustom || [])].length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {[...(activeTenant.familyStandard || []), ...(activeTenant.familyCustom || [])].map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">কোনো সদস্য নির্বাচন করা হয়নি (একা থাকবেন)</p>
                )}
              </div>

              {/* Documents Gallery */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-emerald-600" /> সংরক্ষিত NID ও ডকুমেন্টস
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditTenant(activeTenant);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    + আরও ছবি তুলুন
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {renderDocThumb('NID সামনের অংশ', activeTenant.nidFrontImg)}
                  {renderDocThumb('NID পেছনের অংশ', activeTenant.nidBackImg)}
                  {renderDocThumb('অফিস ID / লাইসেন্স', activeTenant.officeIdImg)}
                  {(activeTenant.extraDocs || []).map((ed, idx) => (
                    <React.Fragment key={`${ed.label}-${idx}`}>
                      {renderDocThumb(ed.label || 'জরুরি ডকুমেন্ট', ed.img)}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Unit Bills History */}
              <div className="space-y-2.5">
                <h5 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" /> এই রুমের মাসিক বিল ও বকেয়া ইতিহাস
                </h5>
                {unitBills.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl text-center">
                    এখনো কোনো বিল তৈরি করা হয়নি।
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">মাস</th>
                          <th className="p-2.5">ইউনিট</th>
                          <th className="p-2.5 text-right">মোট বিল</th>
                          <th className="p-2.5 text-right">জমা</th>
                          <th className="p-2.5 text-right">বকেয়া</th>
                          <th className="p-2.5 text-right">স্ট্যাটাস / রশিদ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {unitBills.map((b) => (
                          <tr key={b.id}>
                            <td className="p-2.5 font-semibold">{formatBanglaMonth(b.month)}</td>
                            <td className="p-2.5 font-num">
                              {b.consumedUnits} U ({formatBDT(b.elecBill)})
                            </td>
                            <td className="p-2.5 font-num font-bold text-right">
                              {formatBDT(b.totalPayable)}
                            </td>
                            <td className="p-2.5 font-num text-emerald-700 font-bold text-right">
                              {formatBDT(b.paidAmount)}
                            </td>
                            <td
                              className={`p-2.5 font-num font-bold text-right ${
                                b.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                              }`}
                            >
                              {formatBDT(b.dueAmount)}
                            </td>
                            <td className="p-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {b.dueAmount > 0 ? (
                                  <button
                                    type="button"
                                    disabled={markingBillId === b.id}
                                    onClick={() => void handleMarkPaid(b)}
                                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-bold inline-flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{markingBillId === b.id ? '...' : 'Paid'}</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> ক্লিয়ার
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onOpenReceipt(b)}
                                  title="রশিদ দেখুন"
                                  className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Past Tenants for this Unit */}
          {pastTenants.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h5 className="text-xs font-bold text-slate-600">এই রুমের পূর্ববর্তী ভাড়াটিয়াদের ইতিহাস</h5>
              <div className="space-y-2">
                {pastTenants.map((pt) => (
                  <div
                    key={pt.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs gap-2"
                  >
                    <div>
                      <strong className="text-slate-800">{pt.name}</strong> ({pt.phone})
                      <span className="block text-slate-500 font-num">
                        In: {pt.inDate || '-'} → Out: {pt.outDate}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditTenant(pt);
                      }}
                      className="text-emerald-700 font-bold hover:underline whitespace-nowrap shrink-0"
                    >
                      তথ্য দেখুন
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
