import { Bill, FIELD_LIMITS, Tenant, Unit } from '../types';

export function formatBDT(num: number | undefined | null): string {
  return '৳' + Number(num || 0).toLocaleString('en-IN');
}

export function formatBanglaMonth(ym: string | undefined): string {
  if (!ym || !ym.includes('-')) return '-';
  const [y, m] = ym.split('-');
  const months = [
    'জানুয়ারি',
    'ফেব্রুয়ারি',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ্টেম্বর',
    'অক্টোবর',
    'নভেম্বর',
    'ডিসেম্বর',
  ];
  const idx = parseInt(m, 10) - 1;
  return `${months[idx] || m} ${y}`;
}

export function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

export function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, FIELD_LIMITS.ID_MAX);
  return cleaned || `id_${Date.now()}`;
}

export function generateDefault30Units(ownerUid: string): Omit<Unit, 'createdAt' | 'updatedAt'>[] {
  const units: Omit<Unit, 'createdAt' | 'updatedAt'>[] = [];
  units.push({
    id: 'shop_1',
    ownerUid,
    type: 'shop',
    name: 'দোকান ০১',
    floor: 'নিচতলা (সামনে)',
    defaultRent: 15000,
    sortOrder: 1,
  });
  units.push({
    id: 'shop_2',
    ownerUid,
    type: 'shop',
    name: 'দোকান ০২',
    floor: 'নিচতলা (সামনে)',
    defaultRent: 15000,
    sortOrder: 2,
  });

  const floorNames = ['১ম তলা', '২য় তলা', '৩য় তলা', '৪র্থ তলা'];
  let order = 3;
  for (let floor = 1; floor <= 4; floor++) {
    for (let num = 1; num <= 7; num++) {
      const roomNo = `${floor}0${num}`;
      units.push({
        id: `room_${roomNo}`,
        ownerUid,
        type: 'room',
        name: `রুম ${roomNo}`,
        floor: floorNames[floor - 1],
        defaultRent: 8000,
        sortOrder: order++,
      });
    }
  }
  return units;
}

export function compressImageFile(
  file: File,
  maxWidth: number,
  maxChars: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const qualities = [0.7, 0.56, 0.42, 0.3];
        let result = canvas.toDataURL('image/jpeg', qualities[0]);
        for (let i = 1; i < qualities.length && result.length > maxChars; i++) {
          result = canvas.toDataURL('image/jpeg', qualities[i]);
        }

        if (result.length > maxChars) {
          const scale = 0.7;
          canvas.width = Math.max(120, Math.round(canvas.width * scale));
          canvas.height = Math.max(120, Math.round(canvas.height * scale));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          result = canvas.toDataURL('image/jpeg', 0.4);
        }

        resolve(result.slice(0, maxChars));
      };
      img.src = String(e.target?.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function exportBillsToCSV(bills: Bill[], units: Unit[], tenants: Tenant[]): void {
  const headers = [
    'Month',
    'Unit',
    'Tenant',
    'Prev Meter',
    'Curr Meter',
    'Units',
    'Base Rent',
    'Elec Bill',
    'Other',
    'Prev Due',
    'Total',
    'Paid',
    'Due',
    'Method',
    'Date',
  ];
  const rows = bills.map((b) => {
    const u = units.find((item) => item.id === b.unitId) || { name: '-' };
    const t = tenants.find((item) => item.id === b.tenantId) || { name: '-' };
    return [
      b.month,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      b.prevReading,
      b.currReading,
      b.consumedUnits,
      b.baseRent,
      b.elecBill,
      b.otherCharge,
      b.prevDue,
      b.totalPayable,
      b.paidAmount,
      b.dueAmount,
      b.payMethod,
      b.payDate,
    ].join(',');
  });
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BariVara_Hisab_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
