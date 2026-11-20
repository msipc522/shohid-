import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Bill,
  ExtraDoc,
  FIELD_LIMITS,
  HouseSettings,
  PayMethod,
  Tenant,
  Unit,
  UnitType,
} from '../types';
import { clampString, generateDefault30Units, sanitizeId } from '../utils/formatters';

export async function initializeOwnerWorkspaceIfNeeded(user: User): Promise<void> {
  const userDocPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }

  if (snap.exists() && snap.data()?.initialized) {
    return;
  }

  try {
    const batch = writeBatch(db);
    const settingsPayload = {
      ownerUid: user.uid,
      email: clampString(user.email || '', 254),
      displayName: clampString(user.displayName || '', 120),
      houseName: 'স্বপ্ননীড় ভিলা ও মার্কেট',
      houseAddress: 'বাড়ি/মার্কেটের ঠিকানা ও মোবাইল',
      unitRate: 10,
      initialized: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      batch.set(userRef, settingsPayload);
    } else {
      batch.update(userRef, {
        initialized: true,
        updatedAt: serverTimestamp(),
      });
    }

    const defaultUnits = generateDefault30Units(user.uid);
    for (const unit of defaultUnits) {
      const unitRef = doc(db, 'users', user.uid, 'units', unit.id);
      batch.set(unitRef, {
        ...unit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userDocPath);
  }
}

export async function saveHouseSettings(
  uid: string,
  settings: Pick<HouseSettings, 'houseName' | 'houseAddress' | 'unitRate'>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      houseName: clampString(settings.houseName, FIELD_LIMITS.HOUSE_NAME_MAX) || 'BariVara Pro',
      houseAddress: clampString(settings.houseAddress, FIELD_LIMITS.HOUSE_ADDRESS_MAX),
      unitRate: Math.max(0, Math.min(500, Number(settings.unitRate) || 10)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUnitInfo(
  uid: string,
  unitId: string,
  updates: Pick<Unit, 'name' | 'floor' | 'defaultRent'> & { type?: UnitType }
): Promise<void> {
  const path = `users/${uid}/units/${unitId}`;
  try {
    const payload: Record<string, unknown> = {
      name: clampString(updates.name, FIELD_LIMITS.UNIT_NAME_MAX) || unitId,
      floor: clampString(updates.floor, FIELD_LIMITS.UNIT_FLOOR_MAX),
      defaultRent: Math.max(0, Math.min(10000000, Number(updates.defaultRent) || 0)),
      updatedAt: serverTimestamp(),
    };
    if (updates.type) {
      payload.type = updates.type;
    }
    await updateDoc(doc(db, 'users', uid, 'units', unitId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateFamilyRoomAssignments(
  uid: string,
  units: Unit[],
  selectedFamilyIds: Set<string>
): Promise<number> {
  const path = `users/${uid}/units`;
  try {
    const batch = writeBatch(db);
    let changedCount = 0;

    for (const unit of units) {
      if (unit.type === 'shop') continue;
      const shouldBeFamily = selectedFamilyIds.has(unit.id);
      const nextType: UnitType = shouldBeFamily ? 'family' : 'room';
      if (unit.type !== nextType) {
        batch.update(doc(db, 'users', uid, 'units', unit.id), {
          type: nextType,
          updatedAt: serverTimestamp(),
        });
        changedCount++;
      }
    }

    if (changedCount > 0) {
      await batch.commit();
    }
    return changedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

function buildTenantPayload(uid: string, tenant: Tenant, isNew: boolean) {
  const cleanExtraDocs: ExtraDoc[] = (tenant.extraDocs || [])
    .slice(0, FIELD_LIMITS.EXTRA_DOCS_MAX_ITEMS)
    .map((ed) => ({
      label: clampString(ed.label || 'ডকুমেন্ট', FIELD_LIMITS.EXTRA_DOC_LABEL_MAX),
      img: clampString(ed.img || '', FIELD_LIMITS.DOC_IMG_MAX),
    }));

  const cleanFamilyStd = (tenant.familyStandard || [])
    .slice(0, FIELD_LIMITS.FAMILY_STD_MAX_ITEMS)
    .map((s) => clampString(s, FIELD_LIMITS.FAMILY_ITEM_MAX_LEN))
    .filter(Boolean);

  const cleanFamilyCustom = (tenant.familyCustom || [])
    .slice(0, FIELD_LIMITS.FAMILY_CUSTOM_MAX_ITEMS)
    .map((s) => clampString(s, FIELD_LIMITS.FAMILY_ITEM_MAX_LEN))
    .filter(Boolean);

  const base = {
    unitId: sanitizeId(tenant.unitId),
    name: clampString(tenant.name, FIELD_LIMITS.TENANT_NAME_MAX) || 'ভাড়াটিয়া',
    occupation: clampString(tenant.occupation, FIELD_LIMITS.OCCUPATION_MAX),
    phone: clampString(tenant.phone, FIELD_LIMITS.PHONE_MAX) || '-',
    familyPhone: clampString(tenant.familyPhone, FIELD_LIMITS.PHONE_MAX),
    homeAddress: clampString(tenant.homeAddress, FIELD_LIMITS.ADDRESS_MAX),
    rent: Math.max(0, Math.min(10000000, Number(tenant.rent) || 0)),
    advance: Math.max(0, Math.min(50000000, Number(tenant.advance) || 0)),
    inDate: clampString(tenant.inDate, FIELD_LIMITS.DATE_MAX),
    outDate: clampString(tenant.outDate, FIELD_LIMITS.DATE_MAX),
    initialMeter: Math.max(0, Math.min(10000000, Number(tenant.initialMeter) || 0)),
    nidNumber: clampString(tenant.nidNumber, FIELD_LIMITS.NID_MAX),
    familyStandard: cleanFamilyStd,
    familyCustom: cleanFamilyCustom,
    passportImg: clampString(tenant.passportImg, FIELD_LIMITS.PASSPORT_IMG_MAX),
    nidFrontImg: clampString(tenant.nidFrontImg, FIELD_LIMITS.DOC_IMG_MAX),
    nidBackImg: clampString(tenant.nidBackImg, FIELD_LIMITS.DOC_IMG_MAX),
    officeIdImg: clampString(tenant.officeIdImg, FIELD_LIMITS.DOC_IMG_MAX),
    extraDocs: cleanExtraDocs,
    updatedAt: serverTimestamp(),
  };

  if (isNew) {
    return {
      ...base,
      id: sanitizeId(tenant.id),
      ownerUid: uid,
      createdAt: serverTimestamp(),
    };
  }
  return base;
}

export async function saveTenantRecord(uid: string, tenant: Tenant, isNew: boolean): Promise<void> {
  const safeId = sanitizeId(tenant.id);
  const path = `users/${uid}/tenants/${safeId}`;
  const ref = doc(db, 'users', uid, 'tenants', safeId);
  try {
    if (isNew) {
      await setDoc(ref, buildTenantPayload(uid, { ...tenant, id: safeId }, true));
    } else {
      await updateDoc(ref, buildTenantPayload(uid, { ...tenant, id: safeId }, false));
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteTenantRecord(uid: string, tenantId: string): Promise<void> {
  const path = `users/${uid}/tenants/${tenantId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'tenants', tenantId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

function buildBillPayload(uid: string, bill: Bill, isNew: boolean) {
  const allowedMethods: PayMethod[] = ['Cash', 'bKash', 'Nagad', 'Bank'];
  const payMethod: PayMethod = allowedMethods.includes(bill.payMethod) ? bill.payMethod : 'Cash';
  const prevReading = Math.max(0, Number(bill.prevReading) || 0);
  const currReading = Math.max(prevReading, Number(bill.currReading) || prevReading);
  const unitRate = Math.max(0, Math.min(500, Number(bill.unitRate) || 0));
  const consumedUnits = Number(Math.max(0, currReading - prevReading).toFixed(2));
  const baseRent = Math.max(0, Number(bill.baseRent) || 0);
  const elecBill = Math.max(0, Math.round(consumedUnits * unitRate));
  const otherCharge = Math.max(0, Number(bill.otherCharge) || 0);
  const prevDue = Math.max(0, Number(bill.prevDue) || 0);
  const totalPayable = Math.max(0, baseRent + elecBill + otherCharge + prevDue);
  const paidAmount = Math.max(0, Number(bill.paidAmount) || 0);
  const dueAmount = Math.max(0, totalPayable - paidAmount);
  const monthMatch = /^\d{4}-\d{2}$/.test(bill.month) ? bill.month : new Date().toISOString().slice(0, 7);

  const base = {
    unitId: sanitizeId(bill.unitId),
    tenantId: clampString(bill.tenantId || '', FIELD_LIMITS.ID_MAX),
    month: monthMatch,
    prevReading,
    currReading,
    unitRate,
    consumedUnits,
    baseRent,
    elecBill,
    otherCharge,
    prevDue,
    totalPayable,
    paidAmount,
    dueAmount,
    payMethod,
    payDate: clampString(bill.payDate || '', FIELD_LIMITS.DATE_MAX),
    updatedAt: serverTimestamp(),
  };

  if (isNew) {
    return {
      ...base,
      id: sanitizeId(bill.id),
      ownerUid: uid,
      createdAt: serverTimestamp(),
    };
  }
  return base;
}

export async function saveBillRecord(uid: string, bill: Bill, isNew: boolean): Promise<void> {
  const safeId = sanitizeId(bill.id);
  const path = `users/${uid}/bills/${safeId}`;
  const ref = doc(db, 'users', uid, 'bills', safeId);
  try {
    if (isNew) {
      await setDoc(ref, buildBillPayload(uid, { ...bill, id: safeId }, true));
    } else {
      await updateDoc(ref, buildBillPayload(uid, { ...bill, id: safeId }, false));
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function markBillAsPaid(uid: string, bill: Bill): Promise<void> {
  const safeId = sanitizeId(bill.id);
  const path = `users/${uid}/bills/${safeId}`;
  try {
    const today = new Date().toISOString().slice(0, 10);
    await updateDoc(doc(db, 'users', uid, 'bills', safeId), {
      paidAmount: Math.max(0, Number(bill.totalPayable) || 0),
      dueAmount: 0,
      payDate: today,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBillRecord(uid: string, billId: string): Promise<void> {
  const path = `users/${uid}/bills/${billId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'bills', billId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
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
        extraDocs?: ExtraDoc[];
      };
    }
  >;
  bills?: Array<Partial<Bill>>;
}

export async function importBackupToCloud(
  uid: string,
  backup: LegacyOrCloudBackup,
  existingUnitIds: Set<string>,
  existingTenantIds: Set<string>,
  existingBillIds: Set<string>
): Promise<{ unitsCount: number; tenantsCount: number; billsCount: number }> {
  const units = Array.isArray(backup.units) ? backup.units : [];
  const tenants = Array.isArray(backup.tenants) ? backup.tenants : [];
  const bills = Array.isArray(backup.bills) ? backup.bills : [];

  try {
    // Step 1: Update settings + commit all units first so exists() checks pass for tenants & bills
    const unitBatch = writeBatch(db);
    if (backup.settings) {
      unitBatch.update(doc(db, 'users', uid), {
        houseName: clampString(backup.settings.houseName || 'স্বপ্ননীড় ভিলা ও মার্কেট', FIELD_LIMITS.HOUSE_NAME_MAX),
        houseAddress: clampString(backup.settings.houseAddress || '', FIELD_LIMITS.HOUSE_ADDRESS_MAX),
        unitRate: Math.max(0, Math.min(500, Number(backup.settings.unitRate) || 10)),
        updatedAt: serverTimestamp(),
      });
    }

    const validUnitIds = new Set(existingUnitIds);
    units.forEach((u, index) => {
      const unitId = sanitizeId(u.id || `unit_${index + 1}`);
      validUnitIds.add(unitId);
      const ref = doc(db, 'users', uid, 'units', unitId);
      const isNew = !existingUnitIds.has(unitId);
      const payload = {
        type: u.type === 'shop' ? 'shop' : u.type === 'family' ? 'family' : 'room',
        name: clampString(u.name || unitId, FIELD_LIMITS.UNIT_NAME_MAX),
        floor: clampString(u.floor || '', FIELD_LIMITS.UNIT_FLOOR_MAX),
        defaultRent: Math.max(0, Number(u.defaultRent) || 0),
        sortOrder: Number(u.sortOrder ?? index + 1),
        updatedAt: serverTimestamp(),
      };
      if (isNew) {
        unitBatch.set(ref, {
          ...payload,
          id: unitId,
          ownerUid: uid,
          createdAt: serverTimestamp(),
        });
      } else {
        unitBatch.update(ref, payload);
      }
    });

    await unitBatch.commit();

    // Step 2: Commit tenants and bills in chunks of 250 operations
    const ops: Array<() => void> = [];
    const batchQueue: ReturnType<typeof writeBatch>[] = [writeBatch(db)];
    let currentOps = 0;

    const getBatch = () => {
      if (currentOps >= 250) {
        batchQueue.push(writeBatch(db));
        currentOps = 0;
      }
      currentOps++;
      return batchQueue[batchQueue.length - 1];
    };

    for (const t of tenants) {
      const unitId = sanitizeId(t.unitId || '');
      if (!validUnitIds.has(unitId)) continue;
      const tenantId = sanitizeId(t.id || `ten_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
      const isNew = !existingTenantIds.has(tenantId);
      const normalized: Tenant = {
        id: tenantId,
        ownerUid: uid,
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
      };
      const ref = doc(db, 'users', uid, 'tenants', tenantId);
      const batch = getBatch();
      if (isNew) {
        batch.set(ref, buildTenantPayload(uid, normalized, true));
      } else {
        batch.update(ref, buildTenantPayload(uid, normalized, false));
      }
    }

    for (const b of bills) {
      const unitId = sanitizeId(b.unitId || '');
      if (!validUnitIds.has(unitId)) continue;
      const billId = sanitizeId(b.id || `bill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
      const isNew = !existingBillIds.has(billId);
      const normalized: Bill = {
        id: billId,
        ownerUid: uid,
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
      };
      const ref = doc(db, 'users', uid, 'bills', billId);
      const batch = getBatch();
      if (isNew) {
        batch.set(ref, buildBillPayload(uid, normalized, true));
      } else {
        batch.update(ref, buildBillPayload(uid, normalized, false));
      }
    }

    void ops;
    for (const batch of batchQueue) {
      await batch.commit();
    }

    return {
      unitsCount: units.length,
      tenantsCount: tenants.length,
      billsCount: bills.length,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function resetWorkspaceToDefault(
  uid: string,
  units: Unit[],
  tenants: Tenant[],
  bills: Bill[]
): Promise<void> {
  try {
    const batches: ReturnType<typeof writeBatch>[] = [writeBatch(db)];
    let count = 0;
    const getBatch = () => {
      if (count >= 350) {
        batches.push(writeBatch(db));
        count = 0;
      }
      count++;
      return batches[batches.length - 1];
    };

    for (const b of bills) {
      getBatch().delete(doc(db, 'users', uid, 'bills', b.id));
    }
    for (const t of tenants) {
      getBatch().delete(doc(db, 'users', uid, 'tenants', t.id));
    }

    const existingUnitMap = new Map(units.map((u) => [u.id, u]));
    const defaults = generateDefault30Units(uid);
    const defaultIds = new Set(defaults.map((u) => u.id));

    for (const u of units) {
      if (!defaultIds.has(u.id)) {
        getBatch().delete(doc(db, 'users', uid, 'units', u.id));
      }
    }

    for (const du of defaults) {
      const ref = doc(db, 'users', uid, 'units', du.id);
      if (existingUnitMap.has(du.id)) {
        getBatch().update(ref, {
          type: du.type,
          name: du.name,
          floor: du.floor,
          defaultRent: du.defaultRent,
          sortOrder: du.sortOrder,
          updatedAt: serverTimestamp(),
        });
      } else {
        getBatch().set(ref, {
          ...du,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    for (const batch of batches) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export function getBillsCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'bills');
}
