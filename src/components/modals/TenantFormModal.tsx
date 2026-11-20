import React, { useEffect, useState } from 'react';
import { Camera, Check, Image as ImageIcon, Plus, Trash2, Upload, User, X } from 'lucide-react';
import {
  ExtraDoc,
  FIELD_LIMITS,
  STANDARD_FAMILY_OPTIONS,
  Tenant,
  Unit,
} from '../../types';
import { compressImageFile } from '../../utils/formatters';

interface TenantFormModalProps {
  isOpen: boolean;
  editingTenant: Tenant | null;
  preselectUnitId: string | null;
  units: Unit[];
  tenants: Tenant[];
  onClose: () => void;
  onSave: (tenant: Tenant, isNew: boolean) => Promise<void>;
  onNotify: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const TenantFormModal: React.FC<TenantFormModalProps> = ({
  isOpen,
  editingTenant,
  preselectUnitId,
  units,
  tenants,
  onClose,
  onSave,
  onNotify,
}) => {
  const [unitId, setUnitId] = useState('');
  const [rent, setRent] = useState('8000');
  const [advance, setAdvance] = useState('0');
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [phone, setPhone] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [inDate, setInDate] = useState('');
  const [outDate, setOutDate] = useState('');
  const [initialMeter, setInitialMeter] = useState('0');
  const [nidNumber, setNidNumber] = useState('');
  const [familyStandard, setFamilyStandard] = useState<string[]>([]);
  const [familyCustom, setFamilyCustom] = useState<string[]>([]);
  const [customMemberInput, setCustomMemberInput] = useState('');
  const [passportImg, setPassportImg] = useState('');
  const [nidFrontImg, setNidFrontImg] = useState('');
  const [nidBackImg, setNidBackImg] = useState('');
  const [officeIdImg, setOfficeIdImg] = useState('');
  const [extraDocs, setExtraDocs] = useState<ExtraDoc[]>([]);
  const [extraDocLabel, setExtraDocLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTenant) {
      setUnitId(editingTenant.unitId);
      setRent(String(editingTenant.rent));
      setAdvance(String(editingTenant.advance || 0));
      setName(editingTenant.name);
      setOccupation(editingTenant.occupation || '');
      setPhone(editingTenant.phone);
      setFamilyPhone(editingTenant.familyPhone || '');
      setHomeAddress(editingTenant.homeAddress || '');
      setInDate(editingTenant.inDate || '');
      setOutDate(editingTenant.outDate || '');
      setInitialMeter(String(editingTenant.initialMeter || 0));
      setNidNumber(editingTenant.nidNumber || '');
      setFamilyStandard(editingTenant.familyStandard || []);
      setFamilyCustom(editingTenant.familyCustom || []);
      setPassportImg(editingTenant.passportImg || '');
      setNidFrontImg(editingTenant.nidFrontImg || '');
      setNidBackImg(editingTenant.nidBackImg || '');
      setOfficeIdImg(editingTenant.officeIdImg || '');
      setExtraDocs(editingTenant.extraDocs || []);
    } else {
      const assignableUnits = units.filter((u) => u.type !== 'family');
      const initialUnit =
        assignableUnits.find((u) => u.id === preselectUnitId) ||
        assignableUnits.find((u) => !tenants.some((t) => t.unitId === u.id && !t.outDate)) ||
        assignableUnits[0] ||
        units[0];
      setUnitId(initialUnit?.id || '');
      setRent(String(initialUnit?.defaultRent || 8000));
      setAdvance('0');
      setName('');
      setOccupation('');
      setPhone('');
      setFamilyPhone('');
      setHomeAddress('');
      setInDate(new Date().toISOString().slice(0, 10));
      setOutDate('');
      setInitialMeter('0');
      setNidNumber('');
      setFamilyStandard([]);
      setFamilyCustom([]);
      setCustomMemberInput('');
      setPassportImg('');
      setNidFrontImg('');
      setNidBackImg('');
      setOfficeIdImg('');
      setExtraDocs([]);
      setExtraDocLabel('');
    }
  }, [isOpen, editingTenant, preselectUnitId, units, tenants]);

  if (!isOpen) return null;

  const handleUnitChange = (newUnitId: string) => {
    setUnitId(newUnitId);
    if (!editingTenant) {
      const found = units.find((u) => u.id === newUnitId);
      if (found) setRent(String(found.defaultRent));
    }
  };

  const toggleStandardFamily = (val: string) => {
    setFamilyStandard((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  const addCustomFamily = () => {
    const trimmed = customMemberInput.trim().slice(0, FIELD_LIMITS.FAMILY_ITEM_MAX_LEN);
    if (!trimmed) return;
    if (familyCustom.length >= FIELD_LIMITS.FAMILY_CUSTOM_MAX_ITEMS) {
      onNotify('সর্বোচ্চ ১৫ জন কাস্টম সদস্য যোগ করা যাবে।', 'error');
      return;
    }
    if (!familyCustom.includes(trimmed)) {
      setFamilyCustom((prev) => [...prev, trimmed]);
    }
    setCustomMemberInput('');
  };

  const handleCaptureImage = async (
    file: File | undefined,
    target: 'passport' | 'nidFront' | 'nidBack' | 'officeId'
  ) => {
    if (!file) return;
    try {
      const maxWidth = target === 'passport' ? 320 : 640;
      const maxChars = target === 'passport' ? 75000 : 100000;
      const dataUrl = await compressImageFile(file, maxWidth, maxChars);
      if (target === 'passport') setPassportImg(dataUrl);
      if (target === 'nidFront') setNidFrontImg(dataUrl);
      if (target === 'nidBack') setNidBackImg(dataUrl);
      if (target === 'officeId') setOfficeIdImg(dataUrl);
      onNotify('ছবি যুক্ত করা হয়েছে!');
    } catch {
      onNotify('ছবি প্রসেস করা যায়নি। অন্য ছবি চেষ্টা করুন।', 'error');
    }
  };

  const handleAddExtraDoc = async (file: File | undefined) => {
    if (!file) return;
    if (extraDocs.length >= FIELD_LIMITS.EXTRA_DOCS_MAX_ITEMS) {
      onNotify('সর্বোচ্চ ৪টি অতিরিক্ত ডকুমেন্ট যুক্ত করা যাবে।', 'error');
      return;
    }
    try {
      const label = (extraDocLabel.trim() || `ডকুমেন্ট #${extraDocs.length + 1}`).slice(
        0,
        FIELD_LIMITS.EXTRA_DOC_LABEL_MAX
      );
      const img = await compressImageFile(file, 640, 100000);
      setExtraDocs((prev) => [...prev, { label, img }]);
      setExtraDocLabel('');
      onNotify(`"${label}" যুক্ত হয়েছে!`);
    } catch {
      onNotify('ডকুমেন্ট ছবি যোগ করা যায়নি।', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant && !outDate) {
      const existingActive = tenants.find((t) => t.unitId === unitId && !t.outDate);
      if (existingActive) {
        onNotify(`এই রুমে ইতিমধ্যে ${existingActive.name} আছেন! আগে তার Out Date দিন।`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Tenant = {
        id: editingTenant?.id || `ten_${Date.now()}`,
        ownerUid: editingTenant?.ownerUid || '',
        unitId,
        name: name.trim(),
        occupation: occupation.trim(),
        phone: phone.trim(),
        familyPhone: familyPhone.trim(),
        homeAddress: homeAddress.trim(),
        rent: Number(rent) || 0,
        advance: Number(advance) || 0,
        inDate,
        outDate,
        initialMeter: Number(initialMeter) || 0,
        nidNumber: nidNumber.trim(),
        familyStandard,
        familyCustom,
        passportImg,
        nidFrontImg,
        nidBackImg,
        officeIdImg,
        extraDocs,
      };
      await onSave(payload, !editingTenant);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const totalFamilyCount = familyStandard.length + familyCustom.length;

  const renderDocSlot = (
    title: string,
    img: string,
    key: 'nidFront' | 'nidBack' | 'officeId',
    onClear: () => void
  ) => (
    <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-slate-800 truncate">{title}</span>
        {img && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
          >
            মুছুন
          </button>
        )}
      </div>
      <div className="h-28 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
        {img ? (
          <img src={img} alt={title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-slate-400">ছবি নেই</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="cursor-pointer min-h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1">
          <Camera className="w-3.5 h-3.5" /> ক্যামেরা
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              void handleCaptureImage(e.target.files?.[0], key);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>
        <label className="cursor-pointer min-h-[38px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1">
          <Upload className="w-3.5 h-3.5" /> ফাইল
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              void handleCaptureImage(e.target.files?.[0], key);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[55] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col border border-slate-200">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-lg">
              {editingTenant ? 'ভাড়াটিয়ার তথ্য ও ডকুমেন্টস আপডেট' : 'নতুন ভাড়াটিয়া ও ডকুমেন্টস যুক্ত করুন'}
            </h3>
            <p className="text-xs text-slate-300">সরাসরি ক্যামেরা দিয়ে ছবি তুলুন অথবা গ্যালারি থেকে যুক্ত করুন</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* 1. Room/Shop & Rent */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">রুম / দোকান নির্বাচন *</label>
              <select
                value={unitId}
                onChange={(e) => handleUnitChange(e.target.value)}
                required
                className="w-full min-h-[42px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800"
              >
                {units
                  .filter((u) => u.type !== 'family' || u.id === editingTenant?.unitId)
                  .map((u) => {
                    const occ = tenants.find((t) => t.unitId === u.id && !t.outDate);
                    const statusLabel =
                      u.type === 'family'
                        ? ' [পারিবারিক]'
                        : occ && u.id !== editingTenant?.unitId
                          ? ` [ভাড়া আছে: ${occ.name}]`
                          : ' [খালি]';
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.floor})
                        {statusLabel}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মাসিক ভাড়া (৳) *</label>
              <input
                type="number"
                required
                min="0"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-num font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">অগ্রিম / জামানত (৳)</label>
              <input
                type="number"
                min="0"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-num"
              />
            </div>
          </div>

          {/* 2. Passport Photo + Personal Info */}
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-28 h-32 rounded-2xl bg-white border border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                {passportImg ? (
                  <img src={passportImg} alt="Passport" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <User className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <span className="text-[11px] font-semibold block leading-tight">পাসপোর্ট ছবি</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <label className="cursor-pointer min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> ক্যামেরা
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => {
                      void handleCaptureImage(e.target.files?.[0], 'passport');
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
                <label className="cursor-pointer min-h-[36px] bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> গ্যালারি
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      void handleCaptureImage(e.target.files?.[0], 'passport');
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ভাড়াটিয়ার পূর্ণ নাম *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: মোঃ কামরুল হাসান"
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">পেশা / দোকানের ধরন</label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="যেমন: চাকরিজীবী / মুদি দোকান"
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">নিজের মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">পরিবারের একজনের মোবাইল *</label>
                  <input
                    type="tel"
                    required
                    value={familyPhone}
                    onChange={(e) => setFamilyPhone(e.target.value)}
                    placeholder="018XXXXXXXX (স্ত্রী/ভাই/বাবা)"
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  স্থায়ী ঠিকানা / গ্রামের বাড়ির ঠিকানা *
                </label>
                <input
                  type="text"
                  required
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="গ্রাম, পোস্ট, থানা, জেলা লিখুন..."
                  className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* 3. Family Members Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900">সাথে কে কে থাকবে (চেকলিস্ট)</label>
              <span className="text-xs text-emerald-700 font-bold">{totalFamilyCount} জন নির্বাচিত</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {STANDARD_FAMILY_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:border-emerald-500 min-h-[42px]"
                >
                  <input
                    type="checkbox"
                    checked={familyStandard.includes(opt)}
                    onChange={() => toggleStandardFamily(opt)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-800">{opt}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                অন্যান্য (নিজের মতো করে লিখে যুক্ত করুন)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMemberInput}
                  onChange={(e) => setCustomMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomFamily();
                    }
                  }}
                  placeholder="যেমন: ভাই, ভাগিনা, দোকানের কর্মচারী..."
                  className="flex-1 min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomFamily}
                  className="min-h-[40px] bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> যুক্ত
                </button>
              </div>
              {familyCustom.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {familyCustom.map((item, idx) => (
                    <span
                      key={`${item}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                    >
                      <Check className="w-3 h-3" /> {item}
                      <button
                        type="button"
                        onClick={() => setFamilyCustom((prev) => prev.filter((_, i) => i !== idx))}
                        className="hover:text-rose-200 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Dates & Meter */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-emerald-700 mb-1">ওঠার তারিখ (In Date) *</label>
              <input
                type="date"
                required
                value={inDate}
                onChange={(e) => setInDate(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-rose-700 mb-1">ছাড়ার তারিখ (Out Date)</label>
              <input
                type="date"
                value={outDate}
                onChange={(e) => setOutDate(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">শুরুর মিটার রিডিং</label>
              <input
                type="number"
                step="any"
                min="0"
                value={initialMeter}
                onChange={(e) => setInitialMeter(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">NID নম্বর</label>
              <input
                type="text"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                placeholder="NID No"
                className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-num"
              />
            </div>
          </div>

          {/* 5. Documents */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900">জরুরি ডকুমেন্টস (ক্যামেরা দিয়ে ছবি তুলুন)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {renderDocSlot('NID কার্ড (সামনের অংশ)', nidFrontImg, 'nidFront', () => setNidFrontImg(''))}
              {renderDocSlot('NID কার্ড (পেছনের অংশ)', nidBackImg, 'nidBack', () => setNidBackImg(''))}
              {renderDocSlot('অফিস ID / ট্রেড লাইসেন্স', officeIdImg, 'officeId', () => setOfficeIdImg(''))}
            </div>

            <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  অন্যান্য জরুরি ডকুমেন্টস (চুক্তিপত্র, পুলিশ ভেরিফিকেশন ইত্যাদি — সর্বোচ্চ ৪টি):
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={extraDocLabel}
                    onChange={(e) => setExtraDocLabel(e.target.value)}
                    placeholder="ডকুমেন্টের নাম..."
                    className="min-h-[38px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                  <label className="cursor-pointer min-h-[38px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shrink-0">
                    <Camera className="w-3.5 h-3.5" /> ছবি যোগ
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        void handleAddExtraDoc(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {extraDocs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {extraDocs.map((d, idx) => (
                    <div key={`${d.label}-${idx}`} className="relative border border-slate-300 rounded-xl overflow-hidden bg-white">
                      <img src={d.img} alt={d.label} className="w-full h-20 object-cover" />
                      <div className="p-1.5 text-[11px] font-bold text-slate-700 truncate">{d.label}</div>
                      <button
                        type="button"
                        onClick={() => setExtraDocs((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
              className="min-h-[42px] px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> {saving ? 'সেভ হচ্ছে...' : 'সব তথ্য সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
