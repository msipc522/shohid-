import React, { useMemo, useState } from 'react';
import { FolderOpen, MapPin, Plus, Search, User } from 'lucide-react';
import { Tenant, TenantListMode, Unit } from '../types';

interface TenantsTabProps {
  units: Unit[];
  tenants: Tenant[];
  onAddTenant: () => void;
  onEditTenant: (tenant: Tenant) => void;
  onOpenUnitDetail: (unitId: string) => void;
}

export const TenantsTab: React.FC<TenantsTabProps> = ({
  units,
  tenants,
  onAddTenant,
  onEditTenant,
  onOpenUnitDetail,
}) => {
  const [mode, setMode] = useState<TenantListMode>('active');
  const [search, setSearch] = useState('');

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const activeList = useMemo(() => tenants.filter((t) => !t.outDate), [tenants]);
  const pastList = useMemo(() => tenants.filter((t) => Boolean(t.outDate)), [tenants]);

  const displayedList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = mode === 'active' ? activeList : pastList;
    return source.filter((t) => {
      if (!q) return true;
      const unitName = unitMap.get(t.unitId)?.name || '';
      return (
        t.name.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        (t.nidNumber || '').toLowerCase().includes(q) ||
        unitName.toLowerCase().includes(q)
      );
    });
  }, [mode, activeList, pastList, search, unitMap]);

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setMode('active')}
            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            বর্তমান ভাড়াটিয়া ({activeList.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('past')}
            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'past' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            পূর্ববর্তী ইতিহাস ({pastList.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="নাম, মোবাইল, NID বা রুম..."
              className="w-full min-h-[42px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <button
            type="button"
            onClick={onAddTenant}
            className="min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" /> নতুন
          </button>
        </div>
      </div>

      {/* Directory Grid */}
      {displayedList.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">কোনো ভাড়াটিয়া পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500">
            নতুন ভাড়াটিয়া যুক্ত করলে এখানে তাদের ছবি, ডকুমেন্টস ও যোগাযোগ নম্বর দেখাবে।
          </p>
          {mode === 'active' && (
            <button
              type="button"
              onClick={onAddTenant}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" /> ভাড়াটিয়া যুক্ত করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedList.map((t) => {
            const unit = unitMap.get(t.unitId);
            const allFamily = [...(t.familyStandard || []), ...(t.familyCustom || [])];

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  {t.passportImg ? (
                    <img
                      src={t.passportImg}
                      alt={t.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-emerald-700">
                      {unit?.name || 'অজানা ইউনিট'}
                    </div>
                    <h3 className="font-bold text-base text-slate-900 truncate">{t.name}</h3>
                    <p className="text-xs text-slate-600 font-num truncate">
                      {t.phone}
                      {t.familyPhone ? ` · ফ্যামিলি: ${t.familyPhone}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{t.homeAddress || '-'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      In: <strong className="font-num text-emerald-700">{t.inDate || '-'}</strong>
                    </span>
                    <span>
                      Out:{' '}
                      <strong className="font-num text-rose-600">{t.outDate || 'চলমান'}</strong>
                    </span>
                  </div>
                  <div className="text-slate-600 truncate">
                    <strong>সাথে থাকবে:</strong> {allFamily.length ? allFamily.join(', ') : 'একা'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenUnitDetail(t.unitId)}
                    className="min-h-[38px] text-xs font-bold text-slate-700 hover:text-emerald-700 inline-flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-4 h-4" /> ডকুমেন্টস ও রুম দেখুন
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditTenant(t)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                  >
                    এডিট
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
