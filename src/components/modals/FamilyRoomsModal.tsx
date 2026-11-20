import React, { useEffect, useState } from 'react';
import { Check, Home, X } from 'lucide-react';
import { Tenant, Unit } from '../../types';

interface FamilyRoomsModalProps {
  isOpen: boolean;
  units: Unit[];
  tenants: Tenant[];
  onClose: () => void;
  onSave: (selectedFamilyUnitIds: Set<string>) => Promise<void>;
}

export const FamilyRoomsModal: React.FC<FamilyRoomsModalProps> = ({
  isOpen,
  units,
  tenants,
  onClose,
  onSave,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set(units.filter((u) => u.type === 'family').map((u) => u.id)));
  }, [isOpen, units]);

  if (!isOpen) return null;

  const residentialUnits = units.filter((u) => u.type !== 'shop');
  const activeTenantMap = new Map(
    tenants.filter((t) => !t.outDate).map((t) => [t.unitId, t])
  );

  const toggleUnit = (unitId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(selectedIds);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const familyCount = selectedIds.size;
  const rentableRoomCount = Math.max(0, residentialUnits.length - familyCount);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[65] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-200"
      >
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-indigo-300 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg truncate">
                নিজেদের / পারিবারিক রুম নির্বাচন করুন
              </h3>
              <p className="text-xs text-slate-300">
                নির্বাচিত রুমগুলো ভাড়াটিয়াদের হিসাব থেকে আলাদা হয়ে যাবে
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs">
            <span className="text-slate-700">
              পারিবারিক ব্যবহার:{' '}
              <strong className="font-num text-indigo-700">{familyCount}টি রুম</strong>
            </span>
            <span className="text-slate-700">
              ভাড়াটিয়ার হিসাবে:{' '}
              <strong className="font-num text-emerald-700">{rentableRoomCount}টি রুম</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {residentialUnits.map((unit) => {
              const activeTenant = activeTenantMap.get(unit.id);
              const isSelected = selectedIds.has(unit.id);
              const isOccupied = Boolean(activeTenant) && !isSelected;

              return (
                <button
                  key={unit.id}
                  type="button"
                  disabled={isOccupied}
                  onClick={() => toggleUnit(unit.id)}
                  className={`text-left min-h-[64px] p-3 rounded-xl border transition flex flex-col justify-between gap-1 ${
                    isOccupied
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-bold text-xs sm:text-sm truncate">{unit.name}</span>
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 truncate">
                    {isOccupied
                      ? `ভাড়া আছে: ${activeTenant?.name}`
                      : isSelected
                        ? 'পারিবারিক ব্যবহার'
                        : unit.floor}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">
            নোট: যেসব রুমে বর্তমানে ভাড়াটিয়া আছেন, সেগুলো আগে Out Date দিয়ে খালি করে তারপর পারিবারিক রুমে সরানো যাবে।
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
              className="min-h-[42px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> {saving ? 'সেভ হচ্ছে...' : 'পরিবর্তন সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
