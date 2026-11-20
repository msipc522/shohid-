import React, { useEffect, useState } from 'react';
import {
  Cloud,
  Download,
  FileSpreadsheet,
  Laptop,
  LogOut,
  RefreshCw,
  RotateCcw,
  Save,
  Sliders,
  Smartphone,
  Upload,
} from 'lucide-react';
import { Bill, HouseSettings, Tenant, Unit } from '../types';
import { exportBillsToCSV } from '../utils/formatters';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsTabProps {
  userEmail: string | null;
  settings: HouseSettings;
  units: Unit[];
  tenants: Tenant[];
  bills: Bill[];
  onSaveSettings: (data: Pick<HouseSettings, 'houseName' | 'houseAddress' | 'unitRate'>) => Promise<void>;
  onImportBackup: (file: File) => Promise<void>;
  onExportExcel: () => Promise<void>;
  onResetWorkspace: () => void;
  onSignInCloud: () => Promise<void>;
  onSwitchCloudAccount: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  userEmail,
  settings,
  units,
  tenants,
  bills,
  onSaveSettings,
  onImportBackup,
  onExportExcel,
  onResetWorkspace,
  onSignInCloud,
  onSwitchCloudAccount,
  onSignOut,
}) => {
  const [houseName, setHouseName] = useState(settings.houseName);
  const [houseAddress, setHouseAddress] = useState(settings.houseAddress);
  const [unitRate, setUnitRate] = useState(String(settings.unitRate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHouseName(settings.houseName);
    setHouseAddress(settings.houseAddress);
    setUnitRate(String(settings.unitRate));
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings({
        houseName: houseName.trim(),
        houseAddress: houseAddress.trim(),
        unitRate: parseFloat(unitRate) || 10,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: {
        houseName: settings.houseName,
        houseAddress: settings.houseAddress,
        unitRate: settings.unitRate,
      },
      units: units.map(({ id, type, name, floor, defaultRent, sortOrder }) => ({
        id,
        type,
        name,
        floor,
        defaultRent,
        sortOrder,
      })),
      tenants: tenants.map((t) => ({
        id: t.id,
        unitId: t.unitId,
        name: t.name,
        occupation: t.occupation,
        phone: t.phone,
        familyPhone: t.familyPhone,
        homeAddress: t.homeAddress,
        rent: t.rent,
        advance: t.advance,
        inDate: t.inDate,
        outDate: t.outDate,
        initialMeter: t.initialMeter,
        nidNumber: t.nidNumber,
        familyStandard: t.familyStandard,
        familyCustom: t.familyCustom,
        passportImg: t.passportImg,
        nidFrontImg: t.nidFrontImg,
        nidBackImg: t.nidBackImg,
        officeIdImg: t.officeIdImg,
        extraDocs: t.extraDocs,
      })),
      bills: bills.map((b) => ({
        id: b.id,
        unitId: b.unitId,
        tenantId: b.tenantId,
        month: b.month,
        prevReading: b.prevReading,
        currReading: b.currReading,
        unitRate: b.unitRate,
        consumedUnits: b.consumedUnits,
        baseRent: b.baseRent,
        elecBill: b.elecBill,
        otherCharge: b.otherCharge,
        prevDue: b.prevDue,
        totalPayable: b.totalPayable,
        paidAmount: b.paidAmount,
        dueAmount: b.dueAmount,
        payMethod: b.payMethod,
        payDate: b.payDate,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BariVara_Cloud_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Storage & Optional Cloud Sync Status */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                {userEmail ? 'অনলাইন ক্লাউড সিঙ্ক চালু আছে' : 'সরাসরি লোকাল সেভ মোড (লগইন ছাড়া)'}
              </h2>
              <p className="text-xs text-slate-600 font-num">
                {userEmail || 'এই ডিভাইসে সব তথ্য ও ছবি অটোমেটিক সেভ থাকছে'}
              </p>
            </div>
          </div>

          {userEmail ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void onSwitchCloudAccount()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> ইমেইল পরিবর্তন করুন
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-4 h-4" /> লগআউট (লোকাল মোড)
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void onSignInCloud()}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Cloud className="w-4 h-4" /> জিমেইল দিয়ে ক্লাউড সিঙ্ক
            </button>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-700 space-y-2">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <Laptop className="w-4 h-4 text-emerald-700" />
            <Smartphone className="w-4 h-4 text-emerald-700" />
            <span>ব্যবহার ও ব্যাকআপ নির্দেশিকা:</span>
          </div>
          <p className="leading-relaxed text-slate-600">
            ১. এখন কোনো ইমেইল লগইন ছাড়াই অ্যাপ সরাসরি খুলবে এবং সব হিসাব ও ছবি নিরাপদে ব্রাউজারে সেভ থাকবে।
            <br />
            ২. অন্য ডিভাইসে (যেমন পিসি থেকে ফোনে) ডাটা নিতে চাইলে নিচে থেকে <strong>JSON ব্যাকআপ</strong> ডাউনলোড করে অন্য ডিভাইসে রিস্টোর করতে পারেন, অথবা ঐচ্ছিকভাবে Google ক্লাউড সিঙ্ক চালু করতে পারেন।
            <br />
            ৩. নিচের বাটন থেকে মোবাইল বা পিসিতে সরাসরি অ্যাপ হিসেবে ইনস্টল করে রাখতে পারেন।
          </p>
          <div className="pt-1">
            <PWAInstallButton variant="card" />
          </div>
        </div>
      </div>

      {/* House Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
        <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600" /> বাড়ির সাধারণ তথ্য ও ইউনিট রেট
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">বাড়ির / মার্কেটের নাম</label>
            <input
              type="text"
              required
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ঠিকানা ও মালিকের মোবাইল</label>
            <input
              type="text"
              value={houseAddress}
              onChange={(e) => setHouseAddress(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ডিফল্ট বিদ্যুৎ ইউনিট রেট (৳)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={unitRate}
              onChange={(e) => setUnitRate(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-num font-bold"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? 'সেভ হচ্ছে...' : 'সেটিংস সেভ করুন'}
        </button>
      </form>

      {/* Backup, Import & Excel Export */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
        <h2 className="font-bold text-base text-slate-900">ব্যাকআপ ডাউনলোড, রিস্টোর ও এক্সেল রিপোর্ট</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          ক্লাউড সিঙ্কের পাশাপাশি চাইলে আপনি যেকোনো সময় সম্পূর্ণ ডাটা ও ছবি <strong>JSON ফাইল</strong> হিসেবে ডাউনলোড করে রাখতে পারেন। আগের HTML ভার্সন থেকে ডাউনলোড করা JSON ব্যাকআপও এখানে ইমপোর্ট করলে সাথে সাথে ক্লাউডে উঠে যাবে।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => void onExportExcel()}
            className="min-h-[44px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> ফরম্যাট করা Excel (.xlsx) ডাউনলোড
          </button>

          <button
            type="button"
            onClick={() => exportBillsToCSV(bills, units, tenants)}
            className="min-h-[44px] flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> সাধারণ CSV রিপোর্ট
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="min-h-[44px] flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm"
          >
            <Download className="w-4 h-4" /> ব্যাকআপ ডাউনলোড (JSON)
          </button>

          <label className="min-h-[44px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer">
            <Upload className="w-4 h-4" /> ব্যাকআপ রিস্টোর (JSON)
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportBackup(file);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">সব ভাড়াটিয়া ও বিল মুছে ৩০ ইউনিট নতুনভাবে শুরু করতে চাইলে:</span>
          <button
            type="button"
            onClick={onResetWorkspace}
            className="min-h-[38px] text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> রিসেট করুন
          </button>
        </div>
      </div>
    </div>
  );
};
