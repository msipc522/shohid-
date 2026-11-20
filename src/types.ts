export type UnitType = 'room' | 'shop' | 'family';

export type PayMethod = 'Cash' | 'bKash' | 'Nagad' | 'Bank';

export type AppTab = 'rooms' | 'billing' | 'tenants' | 'settings';

export type UnitFilter = 'all' | 'room' | 'shop' | 'family' | 'occupied' | 'vacant' | 'due' | 'unpaid_month';

export type TenantListMode = 'active' | 'past';

export interface HouseSettings {
  ownerUid: string;
  email?: string;
  displayName?: string;
  houseName: string;
  houseAddress: string;
  unitRate: number;
  initialized: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Unit {
  id: string;
  ownerUid: string;
  type: UnitType;
  name: string;
  floor: string;
  defaultRent: number;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExtraDoc {
  label: string;
  img: string;
}

export interface Tenant {
  id: string;
  ownerUid: string;
  unitId: string;
  name: string;
  occupation: string;
  phone: string;
  familyPhone: string;
  homeAddress: string;
  rent: number;
  advance: number;
  inDate: string;
  outDate: string;
  initialMeter: number;
  nidNumber: string;
  familyStandard: string[];
  familyCustom: string[];
  passportImg: string;
  nidFrontImg: string;
  nidBackImg: string;
  officeIdImg: string;
  extraDocs: ExtraDoc[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Bill {
  id: string;
  ownerUid: string;
  unitId: string;
  tenantId: string;
  month: string;
  prevReading: number;
  currReading: number;
  unitRate: number;
  consumedUnits: number;
  baseRent: number;
  elecBill: number;
  otherCharge: number;
  prevDue: number;
  totalPayable: number;
  paidAmount: number;
  dueAmount: number;
  payMethod: PayMethod;
  payDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export const FIELD_LIMITS = {
  ID_MAX: 128,
  HOUSE_NAME_MAX: 120,
  HOUSE_ADDRESS_MAX: 240,
  UNIT_NAME_MAX: 80,
  UNIT_FLOOR_MAX: 80,
  TENANT_NAME_MAX: 120,
  OCCUPATION_MAX: 120,
  PHONE_MAX: 40,
  ADDRESS_MAX: 300,
  DATE_MAX: 20,
  NID_MAX: 40,
  FAMILY_STD_MAX_ITEMS: 10,
  FAMILY_CUSTOM_MAX_ITEMS: 15,
  FAMILY_ITEM_MAX_LEN: 80,
  PASSPORT_IMG_MAX: 155000,
  DOC_IMG_MAX: 215000,
  EXTRA_DOC_LABEL_MAX: 100,
  EXTRA_DOCS_MAX_ITEMS: 4,
} as const;

export const STANDARD_FAMILY_OPTIONS = [
  'Wife (স্ত্রী)',
  'Son (ছেলে)',
  'Daughter (মেয়ে)',
  'Mother (মা)',
  'Father (বাবা)',
  'Sister (বোন)',
] as const;
