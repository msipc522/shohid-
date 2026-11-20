import React, { useCallback, useEffect, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  Building2,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  LayoutGrid,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import {
  deleteBillRecord,
  importBackupToCloud,
  initializeOwnerWorkspaceIfNeeded,
  markBillAsPaid,
  resetWorkspaceToDefault,
  saveBillRecord,
  saveHouseSettings,
  saveTenantRecord,
  updateFamilyRoomAssignments,
  updateUnitInfo,
} from './services/firestoreService';
import {
  createDefaultLocalWorkspace,
  loadLocalWorkspace,
  mergeBackupIntoLocalWorkspace,
  saveLocalWorkspace,
} from './services/localStore';
import { exportStyledExcelWorkbook } from './utils/excelExport';
import { AppTab, Bill, HouseSettings, Tenant, ToastMessage, Unit, UnitType } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DashboardTab } from './components/DashboardTab';
import { BillingTab } from './components/BillingTab';
import { TenantsTab } from './components/TenantsTab';
import { SettingsTab } from './components/SettingsTab';
import { UnitDetailModal } from './components/modals/UnitDetailModal';
import { TenantFormModal } from './components/modals/TenantFormModal';
import { EditUnitModal } from './components/modals/EditUnitModal';
import { FamilyRoomsModal } from './components/modals/FamilyRoomsModal';
import { BillModal } from './components/modals/BillModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { LightboxModal } from './components/modals/LightboxModal';
import { ConfirmModal } from './components/modals/ConfirmModal';

const DEFAULT_SETTINGS: HouseSettings = {
  ownerUid: '',
  houseName: 'স্বপ্ননীড় ভিলা ও মার্কেট',
  houseAddress: '',
  unitRate: 10,
  initialized: false,
};

function BariVaraWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<AppTab>('rooms');
  const [settings, setSettings] = useState<HouseSettings>(DEFAULT_SETTINGS);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modal States
  const [detailUnitId, setDetailUnitId] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [familyModalOpen, setFamilyModalOpen] = useState(false);

  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [preselectTenantUnitId, setPreselectTenantUnitId] = useState<string | null>(null);

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [preselectBillUnitId, setPreselectBillUnitId] = useState<string | null>(null);

  const [receiptBill, setReceiptBill] = useState<Bill | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string | null; title: string }>({
    src: null,
    title: '',
  });
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    let active = true;
    void getRedirectResult(auth).catch((err) => {
      if (!active) return;
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/unauthorized-domain') {
        notify('এই শেয়ার লিংকের ডোমেইন Firebase-এ অনুমোদিত নয়; লোকাল মোড ব্যবহার করুন।', 'error');
      } else if (code && code !== 'auth/popup-closed-by-user') {
        notify(`জিমেইল লগইন সম্পন্ন করা যায়নি (${code})।`, 'error');
      }
    });
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [notify]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    if (!user) {
      setDataLoading(true);
      void loadLocalWorkspace().then((data) => {
        if (!active) return;
        setSettings(data.settings);
        setUnits(data.units);
        setTenants(data.tenants);
        setBills(data.bills);
        setDataLoading(false);
      });
      return () => {
        active = false;
      };
    }

    let unsubSettings = () => {};
    let unsubUnits = () => {};
    let unsubTenants = () => {};
    let unsubBills = () => {};
    setDataLoading(true);

    const setupListeners = async () => {
      try {
        await initializeOwnerWorkspaceIfNeeded(user);
      } catch (err) {
        console.error(err);
      }
      if (!active) return;

      const userDocPath = `users/${user.uid}`;
      unsubSettings = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          if (!active) return;
          if (snap.exists()) {
            setSettings(snap.data() as HouseSettings);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, userDocPath)
      );

      const unitsPath = `users/${user.uid}/units`;
      unsubUnits = onSnapshot(
        query(collection(db, 'users', user.uid, 'units'), where('ownerUid', '==', user.uid)),
        (snap) => {
          if (!active) return;
          const loaded = snap.docs
            .map((d) => d.data() as Unit)
            .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
          setUnits(loaded);
          setDataLoading(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, unitsPath)
      );

      const tenantsPath = `users/${user.uid}/tenants`;
      unsubTenants = onSnapshot(
        query(collection(db, 'users', user.uid, 'tenants'), where('ownerUid', '==', user.uid)),
        (snap) => {
          if (!active) return;
          setTenants(snap.docs.map((d) => d.data() as Tenant));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, tenantsPath)
      );

      const billsPath = `users/${user.uid}/bills`;
      unsubBills = onSnapshot(
        query(collection(db, 'users', user.uid, 'bills'), where('ownerUid', '==', user.uid)),
        (snap) => {
          if (!active) return;
          setBills(snap.docs.map((d) => d.data() as Bill));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, billsPath)
      );
    };

    void setupListeners();

    return () => {
      active = false;
      unsubSettings();
      unsubUnits();
      unsubTenants();
      unsubBills();
    };
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">অ্যাপ চালু হচ্ছে...</p>
        </div>
      </div>
    );
  }

  const persistLocal = async (
    nextSettings: HouseSettings,
    nextUnits: Unit[],
    nextTenants: Tenant[],
    nextBills: Bill[]
  ) => {
    setSettings(nextSettings);
    setUnits(nextUnits);
    setTenants(nextTenants);
    setBills(nextBills);
    await saveLocalWorkspace({
      settings: nextSettings,
      units: nextUnits,
      tenants: nextTenants,
      bills: nextBills,
    });
  };

  const detailUnit = units.find((u) => u.id === detailUnitId) || null;

  const handleSaveTenant = async (tenant: Tenant, isNew: boolean) => {
    if (user) {
      await saveTenantRecord(user.uid, tenant, isNew);
      notify(isNew ? 'নতুন ভাড়াটিয়া ক্লাউডে সেভ হয়েছে!' : 'ভাড়াটিয়ার তথ্য আপডেট হয়েছে!');
      return;
    }
    const cleanTenant: Tenant = { ...tenant, ownerUid: 'local' };
    const nextTenants = isNew
      ? [...tenants, cleanTenant]
      : tenants.map((t) => (t.id === cleanTenant.id ? cleanTenant : t));
    await persistLocal(settings, units, nextTenants, bills);
    notify(isNew ? 'নতুন ভাড়াটিয়া সেভ হয়েছে!' : 'ভাড়াটিয়ার তথ্য আপডেট হয়েছে!');
  };

  const handleSaveUnitEdit = async (
    unitId: string,
    updates: Pick<Unit, 'name' | 'floor' | 'defaultRent'> & { type?: UnitType }
  ) => {
    if (user) {
      await updateUnitInfo(user.uid, unitId, updates);
      notify('রুম/দোকানের তথ্য আপডেট হয়েছে!');
      return;
    }
    const nextUnits = units.map((u) =>
      u.id === unitId
        ? {
            ...u,
            name: updates.name,
            floor: updates.floor,
            defaultRent: updates.defaultRent,
            type: updates.type || u.type,
          }
        : u
    );
    await persistLocal(settings, nextUnits, tenants, bills);
    notify('রুম/দোকানের তথ্য আপডেট হয়েছে!');
  };

  const handleToggleFamilyCategory = async (unit: Unit, nextType: UnitType) => {
    if (nextType === 'family') {
      const hasActive = tenants.some((t) => t.unitId === unit.id && !t.outDate);
      if (hasActive) {
        notify('এই রুমে এখনো ভাড়াটিয়া আছেন! আগে Out Date দিয়ে খালি করুন।', 'error');
        return;
      }
    }
    if (user) {
      await updateUnitInfo(user.uid, unit.id, {
        name: unit.name,
        floor: unit.floor,
        defaultRent: unit.defaultRent,
        type: nextType,
      });
    } else {
      const nextUnits = units.map((u) => (u.id === unit.id ? { ...u, type: nextType } : u));
      await persistLocal(settings, nextUnits, tenants, bills);
    }
    notify(
      nextType === 'family'
        ? `${unit.name} পারিবারিক ব্যবহারে সরানো হয়েছে!`
        : `${unit.name} আবার ভাড়ার রুমে ফিরিয়ে আনা হয়েছে!`
    );
  };

  const handleVacateUnit = (unit: Unit) => {
    const activeForUnit = tenants.filter((t) => t.unitId === unit.id && !t.outDate);
    if (activeForUnit.length === 0) return;
    const tenantNames = activeForUnit.map((t) => t.name).join(', ');
    setConfirmState({
      isOpen: true,
      title: `${unit.name} খালি করবেন?`,
      message: `${tenantNames}-কে প্রস্থান (Out) হিসেবে চিহ্নিত করে ${unit.name}-এর সব ঘর খালি করা হবে। পূর্ববর্তী বিল ও তথ্য ইতিহাসে সংরক্ষিত থাকবে।`,
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        const today = new Date().toISOString().slice(0, 10);
        if (user) {
          void Promise.all(
            activeForUnit.map((t) => saveTenantRecord(user.uid, { ...t, outDate: today }, false))
          ).then(() => {
            notify(`${unit.name} খালি করা হয়েছে।`);
          });
        } else {
          const activeIds = new Set(activeForUnit.map((t) => t.id));
          const nextTenants = tenants.map((t) =>
            activeIds.has(t.id) ? { ...t, outDate: today } : t
          );
          void persistLocal(settings, units, nextTenants, bills).then(() => {
            notify(`${unit.name} খালি করা হয়েছে।`);
          });
        }
      },
    });
  };

  const handleSaveFamilyRooms = async (selectedIds: Set<string>) => {
    if (user) {
      const changed = await updateFamilyRoomAssignments(user.uid, units, selectedIds);
      if (changed > 0) {
        notify(`${selectedIds.size}টি রুম পারিবারিক বিভাগে আলাদা করা হয়েছে!`);
      } else {
        notify('কোনো পরিবর্তন হয়নি।', 'info');
      }
      return;
    }
    let changed = 0;
    const nextUnits = units.map((u) => {
      if (u.type === 'shop') return u;
      const nextType: UnitType = selectedIds.has(u.id) ? 'family' : 'room';
      if (u.type !== nextType) changed++;
      return { ...u, type: nextType };
    });
    if (changed > 0) {
      await persistLocal(settings, nextUnits, tenants, bills);
      notify(`${selectedIds.size}টি রুম পারিবারিক বিভাগে আলাদা করা হয়েছে!`);
    } else {
      notify('কোনো পরিবর্তন হয়নি।', 'info');
    }
  };

  const handleSaveBill = async (bill: Bill, isNew: boolean) => {
    if (user) {
      await saveBillRecord(user.uid, bill, isNew);
      notify(isNew ? 'নতুন মাসিক বিল ক্লাউডে সেভ হয়েছে!' : 'বিল আপডেট করা হয়েছে!');
      return;
    }
    const cleanBill: Bill = { ...bill, ownerUid: 'local' };
    const nextBills = isNew
      ? [...bills, cleanBill]
      : bills.map((b) => (b.id === cleanBill.id ? cleanBill : b));
    await persistLocal(settings, units, tenants, nextBills);
    notify(isNew ? 'নতুন মাসিক বিল সেভ হয়েছে!' : 'বিল আপডেট করা হয়েছে!');
  };

  const handleMarkBillPaid = async (bill: Bill) => {
    if (user) {
      await markBillAsPaid(user.uid, bill);
      notify('বিল সম্পূর্ণ পরিশোধ (Paid) হিসেবে ক্লিয়ার করা হয়েছে!');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const nextBills = bills.map((b) =>
      b.id === bill.id
        ? {
            ...b,
            paidAmount: Math.max(0, Number(b.totalPayable) || 0),
            dueAmount: 0,
            payDate: today,
          }
        : b
    );
    await persistLocal(settings, units, tenants, nextBills);
    notify('বিল সম্পূর্ণ পরিশোধ (Paid) হিসেবে ক্লিয়ার করা হয়েছে!');
  };

  const handleExportExcel = async () => {
    try {
      notify('ফরম্যাট করা Excel ফাইল তৈরি হচ্ছে...', 'info');
      await exportStyledExcelWorkbook({ settings, units, tenants, bills });
      notify('Excel (.xlsx) ফাইল ডাউনলোড হয়েছে!');
    } catch {
      notify('Excel ফাইল তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    }
  };

  const handleDeleteBill = (bill: Bill) => {
    setConfirmState({
      isOpen: true,
      title: 'বিল মুছে ফেলবেন?',
      message: 'এই মাসের বিলের হিসাব স্থায়ীভাবে মুছে যাবে।',
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        if (user) {
          void deleteBillRecord(user.uid, bill.id).then(() => {
            notify('বিল মুছে ফেলা হয়েছে।');
          });
        } else {
          const nextBills = bills.filter((b) => b.id !== bill.id);
          void persistLocal(settings, units, tenants, nextBills).then(() => {
            notify('বিল মুছে ফেলা হয়েছে।');
          });
        }
      },
    });
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.units)) {
        notify('ভুল ব্যাকআপ ফাইল!', 'error');
        return;
      }
      if (user) {
        notify('ক্লাউডে ব্যাকআপ আপলোড হচ্ছে...', 'info');
        const result = await importBackupToCloud(
          user.uid,
          parsed,
          new Set(units.map((u) => u.id)),
          new Set(tenants.map((t) => t.id)),
          new Set(bills.map((b) => b.id))
        );
        notify(
          `সফল! ${result.unitsCount}টি ইউনিট, ${result.tenantsCount} জন ভাড়াটিয়া ও ${result.billsCount}টি বিল রিস্টোর হয়েছে।`
        );
      } else {
        const merged = mergeBackupIntoLocalWorkspace({ settings, units, tenants, bills }, parsed);
        await persistLocal(
          merged.next.settings,
          merged.next.units,
          merged.next.tenants,
          merged.next.bills
        );
        notify(
          `সফল! ${merged.unitsCount}টি ইউনিট, ${merged.tenantsCount} জন ভাড়াটিয়া ও ${merged.billsCount}টি বিল রিস্টোর হয়েছে।`
        );
      }
    } catch {
      notify('ব্যাকআপ ফাইল পড়া বা রিস্টোর করা সম্ভব হয়নি।', 'error');
    }
  };

  const handleResetWorkspace = () => {
    setConfirmState({
      isOpen: true,
      title: 'সব ডাটা রিসেট করবেন?',
      message: 'সব ভাড়াটিয়া ও বিলের হিসাব মুছে ২৮টি রুম ও ২টি দোকান আবার খালি হয়ে যাবে।',
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        if (user) {
          void resetWorkspaceToDefault(user.uid, units, tenants, bills).then(() => {
            notify('সব ইউনিট খালি ও রিসেট করা হয়েছে।');
          });
        } else {
          const fresh = createDefaultLocalWorkspace();
          void persistLocal(fresh.settings, fresh.units, fresh.tenants, fresh.bills).then(() => {
            notify('সব ইউনিট খালি ও রিসেট করা হয়েছে।');
          });
        }
      },
    });
  };

  const handleSignInCloud = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      notify('ক্লাউড সিঙ্ক চালু হয়েছে!');
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          notify('ক্লাউড সাইন-ইন শুরু করা যায়নি।', 'error');
        }
      } else if (code === 'auth/unauthorized-domain') {
        notify(
          'এই Share/Preview ডোমেইন Firebase Authorized Domains-এ যুক্ত নেই; সরাসরি লোকাল মোডে সব কাজ করতে পারবেন।',
          'error'
        );
      } else if (code !== 'auth/popup-closed-by-user') {
        notify(`ক্লাউড সিঙ্ক চালু করা যায়নি${code ? ` (${code})` : ''}।`, 'error');
      }
    }
  };

  const handleSwitchCloudAccount = async () => {
    await handleSignInCloud();
  };

  const navItems: Array<{ key: AppTab; label: string; mobileLabel: string; icon: React.ReactNode }> = [
    {
      key: 'rooms',
      label: 'ড্যাশবোর্ড ও ৩০ ইউনিট',
      mobileLabel: '৩০ ইউনিট',
      icon: <LayoutGrid className="w-5 h-5 shrink-0" />,
    },
    {
      key: 'billing',
      label: 'মাসিক বিল ও ইউনিট',
      mobileLabel: 'বিদ্যুৎ বিল',
      icon: <Zap className="w-5 h-5 shrink-0" />,
    },
    {
      key: 'tenants',
      label: 'ভাড়াটিয়া ও ডকুমেন্টস',
      mobileLabel: 'ভাড়াটিয়া',
      icon: <Users className="w-5 h-5 shrink-0" />,
    },
    {
      key: 'settings',
      label: 'ক্লাউড ব্যাকআপ ও সেটিংস',
      mobileLabel: 'ব্যাকআপ',
      icon: <Database className="w-5 h-5 shrink-0" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 flex">
      {/* Toast Stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 pointer-events-auto border ${
              t.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {t.type === 'error' ? (
              <XCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 text-white fixed inset-y-0 left-0 z-30">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight truncate">BariVara Pro</h1>
            <p className="text-xs text-slate-400 truncate">২৮ রুম + ২ দোকান</p>
          </div>
        </div>

        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <PWAInstallButton variant="sidebar" />
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>মোট ইউনিট</span>
              <span className="font-num font-semibold text-white">
                {units.filter((u) => u.type === 'family').length > 0
                  ? `${units.filter((u) => u.type !== 'family').length} ভাড়া · ${
                      units.filter((u) => u.type === 'family').length
                    } পরিবার`
                  : '28 Rooms + 2 Shops'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>ইউনিট রেট</span>
              <span className="font-num font-semibold text-emerald-400">
                ৳ {settings.unitRate} / Unit
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Mobile Compact Header (<= 56px) */}
        <header className="md:hidden bg-slate-900 text-white px-4 h-14 sticky top-0 z-30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm truncate">{settings.houseName || 'BariVara Pro'}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton variant="header" />
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              title="সব হিসাব Excel (.xlsx) ডাউনলোড করুন"
              className="min-h-[38px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingBill(null);
                setPreselectBillUnitId(null);
                setBillModalOpen(true);
              }}
              className="min-h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5" /> নতুন বিল
            </button>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <div className="hidden md:flex items-center justify-between gap-8 px-7 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
            <span className="font-bold text-slate-900 truncate">{settings.houseName}</span>
            <span aria-hidden="true">·</span>
            <span className="text-xs text-slate-500 truncate">
              {user?.email || 'সরাসরি লোকাল মোড'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              className="min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Excel ডাউনলোড (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingBill(null);
                setPreselectBillUnitId(null);
                setBillModalOpen(true);
              }}
              className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Zap className="w-4 h-4" /> নতুন মাসিক বিল
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-7 max-w-7xl w-full mx-auto">
          {dataLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'rooms' && (
                <DashboardTab
                  units={units}
                  tenants={tenants}
                  bills={bills}
                  onOpenUnitDetail={(id) => setDetailUnitId(id)}
                  onManageFamilyRooms={() => setFamilyModalOpen(true)}
                  onAssignTenant={(unitId) => {
                    setEditingTenant(null);
                    setPreselectTenantUnitId(unitId);
                    setTenantModalOpen(true);
                  }}
                  onVacateUnit={handleVacateUnit}
                  onToggleFamilyCategory={handleToggleFamilyCategory}
                  onExportExcel={handleExportExcel}
                  onNewBill={() => {
                    setEditingBill(null);
                    setPreselectBillUnitId(null);
                    setBillModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'billing' && (
                <BillingTab
                  units={units}
                  tenants={tenants}
                  bills={bills}
                  onNewBill={() => {
                    setEditingBill(null);
                    setPreselectBillUnitId(null);
                    setBillModalOpen(true);
                  }}
                  onEditBill={(bill) => {
                    setEditingBill(bill);
                    setPreselectBillUnitId(null);
                    setBillModalOpen(true);
                  }}
                  onMarkBillPaid={handleMarkBillPaid}
                  onDeleteBill={handleDeleteBill}
                  onOpenReceipt={(bill) => setReceiptBill(bill)}
                  onExportExcel={handleExportExcel}
                />
              )}

              {activeTab === 'tenants' && (
                <TenantsTab
                  units={units}
                  tenants={tenants}
                  onAddTenant={() => {
                    setEditingTenant(null);
                    setPreselectTenantUnitId(null);
                    setTenantModalOpen(true);
                  }}
                  onEditTenant={(t) => {
                    setEditingTenant(t);
                    setPreselectTenantUnitId(null);
                    setTenantModalOpen(true);
                  }}
                  onOpenUnitDetail={(unitId) => setDetailUnitId(unitId)}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  userEmail={user?.email || null}
                  settings={settings}
                  units={units}
                  tenants={tenants}
                  bills={bills}
                  onSaveSettings={async (data) => {
                    if (user) {
                      await saveHouseSettings(user.uid, data);
                      notify('সেটিংস ক্লাউডে সেভ হয়েছে!');
                    } else {
                      await persistLocal(
                        {
                          ...settings,
                          houseName: data.houseName,
                          houseAddress: data.houseAddress,
                          unitRate: data.unitRate,
                        },
                        units,
                        tenants,
                        bills
                      );
                      notify('সেটিংস সেভ হয়েছে!');
                    }
                  }}
                  onImportBackup={handleImportBackup}
                  onExportExcel={handleExportExcel}
                  onResetWorkspace={handleResetWorkspace}
                  onSignInCloud={handleSignInCloud}
                  onSwitchCloudAccount={handleSwitchCloudAccount}
                  onSignOut={async () => {
                    await signOut(auth);
                    notify('লোকাল মোডে ফিরে এসেছে।');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation (64px height) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 grid grid-cols-4 items-center px-1">
        {navItems.map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
                active ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              {item.icon}
              <span className="text-[11px] leading-none">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>

      <OfflineIndicator />

      {/* Modals */}
      <UnitDetailModal
        unit={detailUnit}
        tenants={tenants}
        bills={bills}
        onClose={() => setDetailUnitId(null)}
        onEditUnit={(u) => setEditingUnit(u)}
        onToggleFamilyCategory={handleToggleFamilyCategory}
        onVacateUnit={handleVacateUnit}
        onAssignTenant={(unitId) => {
          setEditingTenant(null);
          setPreselectTenantUnitId(unitId);
          setTenantModalOpen(true);
        }}
        onEditTenant={(t) => {
          setEditingTenant(t);
          setPreselectTenantUnitId(null);
          setTenantModalOpen(true);
        }}
        onNewBillForUnit={(unitId) => {
          setEditingBill(null);
          setPreselectBillUnitId(unitId);
          setBillModalOpen(true);
        }}
        onMarkBillPaid={handleMarkBillPaid}
        onOpenReceipt={(b) => setReceiptBill(b)}
        onOpenLightbox={(src, title) => setLightbox({ src, title })}
      />

      <TenantFormModal
        isOpen={tenantModalOpen}
        editingTenant={editingTenant}
        preselectUnitId={preselectTenantUnitId}
        units={units}
        tenants={tenants}
        onClose={() => setTenantModalOpen(false)}
        onSave={handleSaveTenant}
        onNotify={notify}
      />

      <EditUnitModal
        unit={editingUnit}
        hasActiveTenant={Boolean(
          editingUnit && tenants.some((t) => t.unitId === editingUnit.id && !t.outDate)
        )}
        onClose={() => setEditingUnit(null)}
        onSave={handleSaveUnitEdit}
      />

      <FamilyRoomsModal
        isOpen={familyModalOpen}
        units={units}
        tenants={tenants}
        onClose={() => setFamilyModalOpen(false)}
        onSave={handleSaveFamilyRooms}
      />

      <BillModal
        isOpen={billModalOpen}
        editingBill={editingBill}
        preselectUnitId={preselectBillUnitId}
        defaultUnitRate={settings.unitRate}
        units={units}
        tenants={tenants}
        bills={bills}
        onClose={() => setBillModalOpen(false)}
        onSave={handleSaveBill}
        onNotify={notify}
      />

      <ReceiptModal
        bill={receiptBill}
        settings={settings}
        units={units}
        tenants={tenants}
        onClose={() => setReceiptBill(null)}
      />

      <LightboxModal
        src={lightbox.src}
        title={lightbox.title}
        onClose={() => setLightbox({ src: null, title: '' })}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onCancel={() => setConfirmState((s) => ({ ...s, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BariVaraWorkspace />
    </ErrorBoundary>
  );
}
