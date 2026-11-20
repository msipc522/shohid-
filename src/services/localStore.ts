import { Bill, HouseSettings, PayMethod, Tenant, Unit } from '../types';
import { generateDefault30Units, sanitizeId } from '../utils/formatters';

const DB_NAME = 'barivara_pro_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const WORKSPACE_KEY = 'default';

export interface LocalWorkspaceData {
  settings: HouseSettings;
  units: Unit[];
  tenants: Tenant[];
  bills: Bill[];
}

export function createDefaultLocalWorkspace(): LocalWorkspaceData {
  return {
    settings: {
      ownerUid: 'local',
      houseName: 'স্বপ্ননীড় ভিলা ও মার্কেট',
      houseAddress: 'বাড়ি/মার্কেটের ঠিকানা ও মোবাইল',
      unitRate: 10,
      initialized: true,
    },
    units: generateDefault30Units('local').map((u) => ({ ...u })),
    tenants: [],
    bills: [],
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

export async function loadLocalWorkspace(): Promise<LocalWorkspaceData> {
  try {
    const db = await openDB();
    const existing = await new Promise<LocalWorkspaceData | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(WORKSPACE_KEY);
      req.onsuccess = () => resolve(req.result as LocalWorkspaceData | undefined);
      req.onerror = () => reject(req.error);
    });
    if (existing && Array.isArray(existing.units) && existing.units.length > 0) {
      return existing;
    }
    const fresh = createDefaultLocalWorkspace();
    await saveLocalWorkspace(fresh);
    return fresh;
  } catch {
    return createDefaultLocalWorkspace();
  }
}

export async function saveLocalWorkspace(data: LocalWorkspaceData): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(data, WORKSPACE_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

interface LegacyOrCloudBackup {
  settings?: Partial<HouseSettings>;
  units?: Array<Partial<Unit>>;
  tenants?: Array<
    Partial<Tenant> & {
      docs?: {
        passport?: string;
        nidFront?: string;
        nidBack?: string;
        officeId?: string;
        extraDocs?: Tenant['extraDocs'];
      };
    }
  >;
  bills?: Array<Partial<Bill>>;
}

export function mergeBackupIntoLocalWorkspace(
  current: LocalWorkspaceData,
  backup: LegacyOrCloudBackup
): {
  next: LocalWorkspaceData;
  unitsCount: number;
  tenantsCount: number;
  billsCount: number;
} {
  const nextSettings: HouseSettings = backup.settings
    ? {
        ...current.settings,
        houseName: backup.settings.houseName || current.settings.houseName,
        houseAddress: backup.settings.houseAddress ?? current.settings.houseAddress,
        unitRate: Number(backup.settings.unitRate) || current.settings.unitRate,
      }
    : current.settings;

  const unitMap = new Map(current.units.map((u) => [u.id, u]));
  const inUnits = Array.isArray(backup.units) ? backup.units : [];
  inUnits.forEach((u, index) => {
    const unitId = sanitizeId(u.id || `unit_${index + 1}`);
    const existing = unitMap.get(unitId);
    unitMap.set(unitId, {
      id: unitId,
      ownerUid: existing?.ownerUid || 'local',
      type: u.type === 'shop' ? 'shop' : u.type === 'family' ? 'family' : 'room',
      name: u.name || existing?.name || unitId,
      floor: u.floor ?? existing?.floor ?? '',
      defaultRent: Number(u.defaultRent ?? existing?.defaultRent ?? 0),
      sortOrder: Number(u.sortOrder ?? existing?.sortOrder ?? index + 1),
    });
  });
  const nextUnits = Array.from(unitMap.values()).sort(
    (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)
  );

  const tenantMap = new Map(current.tenants.map((t) => [t.id, t]));
  const inTenants = Array.isArray(backup.tenants) ? backup.tenants : [];
  for (const t of inTenants) {
    const unitId = sanitizeId(t.unitId || '');
    if (!unitMap.has(unitId)) continue;
    const tenantId = sanitizeId(
      t.id || `ten_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    );
    tenantMap.set(tenantId, {
      id: tenantId,
      ownerUid: 'local',
      unitId,
      name: t.name || 'ভাড়াটিয়া',
      occupation: t.occupation || '',
      phone: t.phone || '-',
      familyPhone: t.familyPhone || '',
      homeAddress: t.homeAddress || '',
      rent: Number(t.rent) || 0,
      advance: Number(t.advance) || 0,
      inDate: t.inDate || '',
      outDate: t.outDate || '',
      initialMeter: Number(t.initialMeter) || 0,
      nidNumber: t.nidNumber || '',
      familyStandard: Array.isArray(t.familyStandard) ? t.familyStandard : [],
      familyCustom: Array.isArray(t.familyCustom) ? t.familyCustom : [],
      passportImg: t.passportImg ?? t.docs?.passport ?? '',
      nidFrontImg: t.nidFrontImg ?? t.docs?.nidFront ?? '',
      nidBackImg: t.nidBackImg ?? t.docs?.nidBack ?? '',
      officeIdImg: t.officeIdImg ?? t.docs?.officeId ?? '',
      extraDocs: Array.isArray(t.extraDocs)
        ? t.extraDocs
        : Array.isArray(t.docs?.extraDocs)
          ? t.docs.extraDocs
          : [],
    });
  }

  const billMap = new Map(current.bills.map((b) => [b.id, b]));
  const inBills = Array.isArray(backup.bills) ? backup.bills : [];
  for (const b of inBills) {
    const unitId = sanitizeId(b.unitId || '');
    if (!unitMap.has(unitId)) continue;
    const billId = sanitizeId(
      b.id || `bill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    );
    billMap.set(billId, {
      id: billId,
      ownerUid: 'local',
      unitId,
      tenantId: b.tenantId || '',
      month: b.month || new Date().toISOString().slice(0, 7),
      prevReading: Number(b.prevReading) || 0,
      currReading: Number(b.currReading) || 0,
      unitRate: Number(b.unitRate) || 10,
      consumedUnits: Number(b.consumedUnits) || 0,
      baseRent: Number(b.baseRent) || 0,
      elecBill: Number(b.elecBill) || 0,
      otherCharge: Number(b.otherCharge) || 0,
      prevDue: Number(b.prevDue) || 0,
      totalPayable: Number(b.totalPayable) || 0,
      paidAmount: Number(b.paidAmount) || 0,
      dueAmount: Number(b.dueAmount) || 0,
      payMethod: (b.payMethod as PayMethod) || 'Cash',
      payDate: b.payDate || '',
    });
  }

  return {
    next: {
      settings: nextSettings,
      units: nextUnits,
      tenants: Array.from(tenantMap.values()),
      bills: Array.from(billMap.values()),
    },
    unitsCount: inUnits.length,
    tenantsCount: inTenants.length,
    billsCount: inBills.length,
  };
}
