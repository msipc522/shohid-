import React, { useEffect, useState } from 'react';
import { Unit, UnitType } from '../../types';

interface EditUnitModalProps {
  unit: Unit | null;
  hasActiveTenant: boolean;
  onClose: () => void;
  onSave: (
    unitId: string,
    updates: Pick<Unit, 'name' | 'floor' | 'defaultRent'> & { type?: UnitType }
  ) => Promise<void>;
}

export const EditUnitModal: React.FC<EditUnitModalProps> = ({
  unit,
  hasActiveTenant,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [floor, setFloor] = useState('');
  const [defaultRent, setDefaultRent] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('room');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (unit) {
      setName(unit.name);
      setFloor(unit.floor);
      setDefaultRent(String(unit.defaultRent));
      setUnitType(unit.type);
    }
  }, [unit]);

  if (!unit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(unit.id, {
        name: name.trim(),
        floor: floor.trim(),
        defaultRent: Number(defaultRent) || 0,
        type: unit.type === 'shop' ? 'shop' : unitType,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <h3 className="font-bold text-lg text-slate-900">রুম / দোকানের তথ্য পরিবর্তন</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">রুম / দোকানের নাম</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ফ্লোর / অবস্থান</label>
            <input
              type="text"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            />
          </div>
          {unit.type !== 'shop' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">রুমের ধরন (ক্যাটাগরি)</label>
              <select
                value={unitType}
                disabled={hasActiveTenant}
                onChange={(e) => setUnitType(e.target.value as UnitType)}
                className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                <option value="room">ভাড়ার রুম (Tenant Room)</option>
                <option value="family">নিজেদের / পারিবারিক ব্যবহার (Family)</option>
              </select>
              {hasActiveTenant && (
                <p className="text-[11px] text-amber-700 mt-1">
                  ভাড়াটিয়া থাকা অবস্থায় ক্যাটাগরি পরিবর্তন করা যাবে না।
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">নির্ধারিত মাসিক ভাড়া (৳)</label>
            <input
              type="number"
              required
              min="0"
              value={defaultRent}
              onChange={(e) => setDefaultRent(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-num font-bold"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold"
            >
              {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
