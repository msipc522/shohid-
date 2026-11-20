import { Bill, HouseSettings, Tenant, Unit } from '../types';
import { formatBanglaMonth } from './formatters';

export interface ExcelExportInput {
  settings: HouseSettings;
  units: Unit[];
  tenants: Tenant[];
  bills: Bill[];
}

const COLORS = {
  slate900: 'FF0F172A',
  slate800: 'FF1E293B',
  slate700: 'FF334155',
  slate100: 'FFF1F5F9',
  slate50: 'FFF8FAFC',
  border: 'FFCBD5E1',
  white: 'FFFFFFFF',
  emerald700: 'FF047857',
  emerald50: 'FFECFDF5',
  rose700: 'FFBE123C',
  rose50: 'FFFFF1F2',
  amber800: 'FF92400E',
  amber50: 'FFFFFBEB',
  indigo700: 'FF4338CA',
  indigo50: 'FFEEF2FF',
};

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: COLORS.border } },
  left: { style: 'thin' as const, color: { argb: COLORS.border } },
  bottom: { style: 'thin' as const, color: { argb: COLORS.border } },
  right: { style: 'thin' as const, color: { argb: COLORS.border } },
};

const STATUS_EMPTY = 'খালি';
const STATUS_FILLED = 'ভাড়া আছে (Fillup)';
const STATUS_FAMILY = 'পারিবারিক ব্যবহার';

function escFormulaStr(value: string): string {
  return value.replace(/"/g, '""');
}

export async function exportStyledExcelWorkbook({
  settings,
  units,
  tenants,
  bills,
}: ExcelExportInput): Promise<void> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default ?? ExcelJSModule;
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'BariVara Pro';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const unitMap = new Map(units.map((u) => [u.id, u]));
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const activeTenantByUnit = new Map<string, Tenant>();
  for (const t of tenants) {
    if (!t.outDate) activeTenantByUnit.set(t.unitId, t);
  }

  const dueByUnit = new Map<string, number>();
  for (const b of bills) {
    dueByUnit.set(b.unitId, (dueByUnit.get(b.unitId) || 0) + Number(b.dueAmount || 0));
  }

  const currentMonthBillsByUnit = new Map<string, Bill[]>();
  for (const b of bills) {
    if (b.month === currentMonth) {
      const arr = currentMonthBillsByUnit.get(b.unitId) || [];
      arr.push(b);
      currentMonthBillsByUnit.set(b.unitId, arr);
    }
  }

  const rentableUnits = units.filter((u) => u.type !== 'family');
  const shops = units.filter((u) => u.type === 'shop');
  const rooms = units.filter((u) => u.type === 'room');
  const familyRooms = units.filter((u) => u.type === 'family');

  interface UnpaidRow {
    unit: Unit;
    tenant: Tenant;
    reasonText: string;
    dueAmount: number;
  }
  const unpaidCurrentList: UnpaidRow[] = [];
  for (const u of rentableUnits) {
    const t = activeTenantByUnit.get(u.id);
    if (!t) continue;
    const mBills = currentMonthBillsByUnit.get(u.id) || [];
    if (mBills.length === 0) {
      unpaidCurrentList.push({
        unit: u,
        tenant: t,
        reasonText: 'এই মাসের বিল এখনো হয়নি',
        dueAmount: Number(t.rent || u.defaultRent || 0),
      });
    } else {
      const mDue = mBills.reduce((s, b) => s + Number(b.dueAmount || 0), 0);
      const mPaid = mBills.reduce((s, b) => s + Number(b.paidAmount || 0), 0);
      if (mDue > 0 || mPaid === 0) {
        unpaidCurrentList.push({
          unit: u,
          tenant: t,
          reasonText: mPaid > 0 ? 'আংশিক পরিশোধ · বকেয়া আছে' : 'বিল অপরিশোধিত',
          dueAmount: mDue > 0 ? mDue : Number(t.rent || 0),
        });
      }
    }
  }

  // Prepare Sheet 2 bill rows first so we know exact row range for Sheet 1 live SUMIF formulas
  interface Sheet2BillRowData {
    isEmpty: boolean;
    monthLabel: string;
    unitName: string;
    tenantName: string;
    prevReading: number;
    currReading: number;
    unitRate: number;
    baseRent: number;
    otherCharge: number;
    prevDue: number;
    paidAmount: number;
    payInfo: string;
  }

  const sortedBills = [...bills].sort((a, b) => b.month.localeCompare(a.month));
  const billRowData: Sheet2BillRowData[] = sortedBills.map((b) => {
    const u = unitMap.get(b.unitId);
    const t = tenantMap.get(b.tenantId) || activeTenantByUnit.get(b.unitId);
    return {
      isEmpty: false,
      monthLabel: formatBanglaMonth(b.month),
      unitName: u?.name || '-',
      tenantName: t?.name || 'ভাড়াটিয়া',
      prevReading: Number(b.prevReading || 0),
      currReading: Number(b.currReading || 0),
      unitRate: Number(b.unitRate || settings.unitRate || 10),
      baseRent: Number(b.baseRent || 0),
      otherCharge: Number(b.otherCharge || 0),
      prevDue: Number(b.prevDue || 0),
      paidAmount: Number(b.paidAmount || 0),
      payInfo: `${b.payMethod || 'Cash'} · ${b.payDate || '-'}`,
    };
  });

  // If no bills exist yet, pre-populate one row per rentable unit:
  // - Filled rooms get full details & formulas
  // - Empty rooms get "খালি" dropdown and ALL detail cells completely empty
  if (billRowData.length === 0) {
    for (const u of rentableUnits) {
      const t = activeTenantByUnit.get(u.id);
      if (t) {
        billRowData.push({
          isEmpty: false,
          monthLabel: formatBanglaMonth(currentMonth),
          unitName: u.name,
          tenantName: t.name,
          prevReading: Number(t.initialMeter || 0),
          currReading: Number(t.initialMeter || 0),
          unitRate: Number(settings.unitRate || 10),
          baseRent: Number(t.rent || u.defaultRent || 0),
          otherCharge: 0,
          prevDue: 0,
          paidAmount: 0,
          payInfo: 'Cash',
        });
      } else {
        billRowData.push({
          isEmpty: true,
          monthLabel: '',
          unitName: u.name,
          tenantName: '',
          prevReading: 0,
          currReading: 0,
          unitRate: Number(settings.unitRate || 10),
          baseRent: 0,
          otherCharge: 0,
          prevDue: 0,
          paidAmount: 0,
          payInfo: '',
        });
      }
    }
  } else {
    // Append 10 blank ready rows with "খালি" / "ভাড়া আছে (Fillup)" dropdown
    for (let i = 0; i < 10; i++) {
      billRowData.push({
        isEmpty: true,
        monthLabel: '',
        unitName: '',
        tenantName: '',
        prevReading: 0,
        currReading: 0,
        unitRate: Number(settings.unitRate || 10),
        baseRent: 0,
        otherCharge: 0,
        prevDue: 0,
        paidAmount: 0,
        payInfo: '',
      });
    }
  }

  const firstBillRowNum = 4;
  const lastBillRowNum = firstBillRowNum + billRowData.length - 1;

  // ==================== SHEET 1: ড্যাশবোর্ড ও রুম সমূহ ====================
  const dashSheet = workbook.addWorksheet('ড্যাশবোর্ড ও রুম সমূহ', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });
  dashSheet.columns = [
    { width: 8 },
    { width: 18 },
    { width: 20 },
    { width: 22 },
    { width: 28 },
    { width: 16 },
    { width: 17 },
    { width: 17 },
  ];

  dashSheet.mergeCells('A1:H1');
  const titleCell = dashSheet.getCell('A1');
  titleCell.value = `${settings.houseName || 'BariVara Pro'} — বাড়ি ভাড়া ও ইউনিট ড্যাশবোর্ড`;
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate900 } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  dashSheet.getRow(1).height = 30;

  dashSheet.mergeCells('A2:H2');
  const subCell = dashSheet.getCell('A2');
  subCell.value = `ঠিকানা: ${settings.houseAddress || '-'}  |  ডিফল্ট বিদ্যুৎ রেট: ৳${settings.unitRate}/Unit  |  তারিখ: ${today}`;
  subCell.font = { size: 10, color: { argb: COLORS.slate100 } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  dashSheet.getRow(2).height = 22;

  dashSheet.addRow([]);

  // Row 4 & 5: KPI Headers & Live Formula Values
  const kpiHeaderRow = dashSheet.addRow([
    'ভাড়ার ইউনিট',
    'ভাড়া দেওয়া',
    'খালি ইউনিট',
    'পারিবারিক রুম',
    'নির্ধারিত মাসিক ভাড়া (৳)',
    'সর্বমোট আদায় (৳)',
    'সর্বমোট বকেয়া (৳)',
    'চলতি মাস বাকি',
  ]);
  kpiHeaderRow.height = 24;
  kpiHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: COLORS.slate700 } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = THIN_BORDER;
  });

  // Placeholder Row 5 (formulas populated once section ranges are known)
  const kpiValRow = dashSheet.addRow([0, 0, 0, 0, 0, 0, 0, 0]);
  kpiValRow.height = 28;
  kpiValRow.eachCell((cell, colNumber) => {
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = THIN_BORDER;
    cell.numFmt = '#,##0';
    let color = COLORS.slate900;
    let bg = COLORS.white;
    if (colNumber === 2 || colNumber === 6) {
      color = COLORS.emerald700;
      bg = COLORS.emerald50;
    } else if (colNumber === 4) {
      color = COLORS.indigo700;
      bg = COLORS.indigo50;
    } else if (colNumber === 7 || colNumber === 8) {
      color = COLORS.rose700;
      bg = COLORS.rose50;
    } else if (colNumber === 3) {
      color = COLORS.amber800;
      bg = COLORS.amber50;
    }
    cell.font = { bold: true, size: 12, color: { argb: color } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  });

  // Row 6: Collection vs Due Percentage & Dropdown Help
  const pctRow = dashSheet.addRow([
    'আদায় হার:',
    { formula: 'IF((F5+G5)>0, F5/(F5+G5), 0)' },
    'বকেয়া হার:',
    { formula: 'IF((F5+G5)>0, G5/(F5+G5), 0)' },
    'অপশন নির্দেশনা:',
    'D কলামে ড্রপডাউন থেকে "খালি" সিলেক্ট করলে রুমের সব ঘর ফাঁকা হয়ে যাবে, আর "ভাড়া আছে (Fillup)" দিলে বিস্তারিত দেখাবে।',
    '',
    '',
  ]);
  dashSheet.mergeCells(pctRow.number, 6, pctRow.number, 8);
  pctRow.height = 24;
  pctRow.getCell(1).font = { bold: true, size: 10, color: { argb: COLORS.emerald700 } };
  pctRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.emerald50 } };
  pctRow.getCell(2).numFmt = '0.0%';
  pctRow.getCell(2).font = { bold: true, size: 10, color: { argb: COLORS.emerald700 } };
  pctRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.emerald50 } };
  pctRow.getCell(3).font = { bold: true, size: 10, color: { argb: COLORS.rose700 } };
  pctRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rose50 } };
  pctRow.getCell(4).numFmt = '0.0%';
  pctRow.getCell(4).font = { bold: true, size: 10, color: { argb: COLORS.rose700 } };
  pctRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rose50 } };
  pctRow.getCell(5).font = { bold: true, size: 10, color: { argb: COLORS.slate700 } };
  pctRow.getCell(6).font = { size: 9, color: { argb: COLORS.slate700 } };
  for (let c = 1; c <= 8; c++) {
    pctRow.getCell(c).border = THIN_BORDER;
    pctRow.getCell(c).alignment = {
      vertical: 'middle',
      horizontal: c === 2 || c === 4 ? 'center' : 'left',
      wrapText: c === 6,
    };
  }

  const addUnitSection = (
    sectionTitle: string,
    list: Unit[],
    headerBg: string,
    headerTextColor: string,
    isFamilySection = false
  ): { startRow: number; endRow: number } => {
    dashSheet.addRow([]);
    const secRow = dashSheet.addRow([sectionTitle]);
    dashSheet.mergeCells(secRow.number, 1, secRow.number, 8);
    secRow.height = 24;
    const secCell = secRow.getCell(1);
    secCell.font = { bold: true, size: 11, color: { argb: headerTextColor } };
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
    secCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 8; c++) {
      secRow.getCell(c).border = THIN_BORDER;
    }

    const colHeader = dashSheet.addRow([
      'নং',
      'ইউনিটের নাম',
      'ফ্লোর / অবস্থান',
      'রুম অবস্থা (অপশন)',
      'ভাড়াটিয়ার নাম / ব্যবহার',
      'মোবাইল নম্বর',
      'মাসিক ভাড়া (৳)',
      'মোট বকেয়া (৳)',
    ]);
    colHeader.height = 22;
    colHeader.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 10, color: { argb: COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber >= 7 ? 'right' : colNumber === 1 ? 'center' : 'left',
      };
      cell.border = THIN_BORDER;
    });

    if (list.length === 0) {
      const emptyRow = dashSheet.addRow([
        '-',
        isFamilySection ? 'কোনো পারিবারিক রুম নেই' : 'কোনো ইউনিট নেই',
        '',
        '',
        '',
        '',
        null,
        null,
      ]);
      dashSheet.mergeCells(emptyRow.number, 2, emptyRow.number, 6);
      emptyRow.eachCell((cell) => {
        cell.font = { size: 10, color: { argb: COLORS.slate700 } };
        cell.border = THIN_BORDER;
      });
      return { startRow: 0, endRow: 0 };
    }

    let startRow = 0;
    let endRow = 0;
    list.forEach((u, idx) => {
      const t = activeTenantByUnit.get(u.id);
      const due = dueByUnit.get(u.id) || 0;
      const isFamily = isFamilySection || u.type === 'family';

      const initialStatus = isFamily
        ? STATUS_FAMILY
        : t
          ? STATUS_FILLED
          : STATUS_EMPTY;

      const row = dashSheet.addRow([
        idx + 1,
        u.name,
        u.floor,
        initialStatus,
        null,
        null,
        null,
        null,
      ]);
      const r = row.number;
      if (idx === 0) startRow = r;
      endRow = r;

      // Excel Dropdown Option for Room Empty vs Fillup
      row.getCell(4).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: isFamily
          ? [`"${STATUS_FAMILY},${STATUS_EMPTY},${STATUS_FILLED}"`]
          : [`"${STATUS_EMPTY},${STATUS_FILLED}"`],
        showInputMessage: true,
        promptTitle: 'রুমের অবস্থা সিলেক্ট করুন',
        prompt: `রুম খালি থাকলে "${STATUS_EMPTY}" আর ভাড়া থাকলে "${STATUS_FILLED}" দিন।`,
      };

      if (isFamily) {
        row.getCell(5).value = {
          formula: `IF($D${r}="${STATUS_EMPTY}","","নিজেদের ব্যবহার (হিসাবের বাইরে)")`,
        };
      } else if (t) {
        // Occupied / Fillup room: show all details when Fillup, make ALL cells empty when খালি
        row.getCell(5).value = {
          formula: `IF($D${r}="${STATUS_EMPTY}","","${escFormulaStr(t.name)}")`,
        };
        row.getCell(6).value = {
          formula: `IF($D${r}="${STATUS_EMPTY}","","${escFormulaStr(t.phone)}")`,
        };
        row.getCell(7).value = {
          formula: `IF($D${r}="${STATUS_EMPTY}","",${Number(t.rent || u.defaultRent || 0)})`,
        };
        row.getCell(8).value = {
          formula: `IF(OR($D${r}="${STATUS_EMPTY}",$D${r}="${STATUS_FAMILY}"),"",SUMIF('মাসিক বিল ও বিদ্যুৎ'!$B$${firstBillRowNum}:$B$${lastBillRowNum},B${r},'মাসিক বিল ও বিদ্যুৎ'!$O$${firstBillRowNum}:$O$${lastBillRowNum}))`,
        };
      } else {
        // Empty room: E, F, G are truly empty cells, H auto-shows empty while খালি
        row.getCell(5).value = null;
        row.getCell(6).value = null;
        row.getCell(7).value = null;
        row.getCell(8).value = {
          formula: `IF(OR($D${r}="${STATUS_EMPTY}",$D${r}="${STATUS_FAMILY}"),"",SUMIF('মাসিক বিল ও বিদ্যুৎ'!$B$${firstBillRowNum}:$B$${lastBillRowNum},B${r},'মাসিক বিল ও বিদ্যুৎ'!$O$${firstBillRowNum}:$O$${lastBillRowNum}))`,
        };
      }

      row.height = 22;
      for (let colNumber = 1; colNumber <= 8; colNumber++) {
        const cell = row.getCell(colNumber);
        cell.border = THIN_BORDER;
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber >= 7 ? 'right' : colNumber === 1 ? 'center' : 'left',
        };
        if (colNumber >= 7) {
          cell.numFmt = '#,##0';
        }
        if (colNumber === 4) {
          cell.font = {
            bold: true,
            size: 10,
            color: {
              argb: isFamily
                ? COLORS.indigo700
                : t
                  ? COLORS.emerald700
                  : COLORS.amber800,
            },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: isFamily
                ? COLORS.indigo50
                : t
                  ? COLORS.emerald50
                  : COLORS.amber50,
            },
          };
        } else if (colNumber === 8 && due > 0 && !isFamily && t) {
          cell.font = { bold: true, size: 10, color: { argb: COLORS.rose700 } };
        } else {
          cell.font = { bold: colNumber === 2, size: 10, color: { argb: COLORS.slate900 } };
        }
      }
    });

    // Dynamic Conditional Formatting on Column D so switching খালি <-> ভাড়া আছে updates colors live in Excel
    dashSheet.addConditionalFormatting({
      ref: `D${startRow}:D${endRow}`,
      rules: [
        {
          priority: 1,
          type: 'cellIs',
          operator: 'equal',
          formulae: [`"${STATUS_EMPTY}"`],
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.amber50 } },
            font: { bold: true, color: { argb: COLORS.amber800 } },
          },
        },
        {
          priority: 2,
          type: 'cellIs',
          operator: 'equal',
          formulae: [`"${STATUS_FILLED}"`],
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.emerald50 } },
            font: { bold: true, color: { argb: COLORS.emerald700 } },
          },
        },
        {
          priority: 3,
          type: 'cellIs',
          operator: 'equal',
          formulae: [`"${STATUS_FAMILY}"`],
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.indigo50 } },
            font: { bold: true, color: { argb: COLORS.indigo700 } },
          },
        },
      ],
    });

    return { startRow, endRow };
  };

  const shopRange = addUnitSection(
    `১. বাণিজ্যিক দোকান সমূহ (${shops.length}টি)`,
    shops,
    COLORS.slate100,
    COLORS.slate900
  );
  const roomRange = addUnitSection(
    `২. ভাড়াটিয়াদের আবাসিক রুম সমূহ (${rooms.length}টি)`,
    rooms,
    COLORS.slate100,
    COLORS.slate900
  );
  const familyRange = addUnitSection(
    `৩. নিজেদের / পারিবারিক রুম সমূহ (${familyRooms.length}টি — ভাড়াটিয়ার হিসাব থেকে আলাদা)`,
    familyRooms,
    COLORS.indigo50,
    COLORS.indigo700,
    true
  );

  // Wire live formulas into KPI Row 5
  const countRangeExpr = (col: string, range: { startRow: number; endRow: number }, cond?: string) => {
    if (!range.startRow) return '0';
    return cond
      ? `COUNTIF(${col}${range.startRow}:${col}${range.endRow},"${cond}")`
      : `COUNTA(${col}${range.startRow}:${col}${range.endRow})`;
  };

  const sumIfFilledExpr = (range: { startRow: number; endRow: number }) => {
    if (!range.startRow) return '0';
    return `SUMIF(D${range.startRow}:D${range.endRow},"${STATUS_FILLED}",G${range.startRow}:G${range.endRow})`;
  };

  kpiValRow.getCell(1).value = {
    formula: `${countRangeExpr('B', shopRange)}+${countRangeExpr('B', roomRange)}`,
  };
  kpiValRow.getCell(2).value = {
    formula: `${countRangeExpr('D', shopRange, STATUS_FILLED)}+${countRangeExpr('D', roomRange, STATUS_FILLED)}`,
  };
  kpiValRow.getCell(3).value = {
    formula: `${countRangeExpr('D', shopRange, STATUS_EMPTY)}+${countRangeExpr('D', roomRange, STATUS_EMPTY)}`,
  };
  kpiValRow.getCell(4).value = familyRange.startRow
    ? { formula: countRangeExpr('B', familyRange) }
    : 0;
  kpiValRow.getCell(5).value = {
    formula: `${sumIfFilledExpr(shopRange)}+${sumIfFilledExpr(roomRange)}`,
  };
  kpiValRow.getCell(6).value = {
    formula: `SUM('মাসিক বিল ও বিদ্যুৎ'!N${firstBillRowNum}:N${lastBillRowNum})`,
  };
  kpiValRow.getCell(7).value = {
    formula: `SUM('মাসিক বিল ও বিদ্যুৎ'!O${firstBillRowNum}:O${lastBillRowNum})`,
  };
  kpiValRow.getCell(8).value =
    unpaidCurrentList.length > 0
      ? { formula: `COUNTA('চলতি মাস বাকি তালিকা'!B4:B${3 + unpaidCurrentList.length})` }
      : 0;

  // ==================== SHEET 2: মাসিক বিল ও বিদ্যুৎ (Live Formula Sheet) ====================
  const billsSheet = workbook.addWorksheet('মাসিক বিল ও বিদ্যুৎ', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  billsSheet.columns = [
    { width: 15 }, // A: মাস
    { width: 14 }, // B: রুম / দোকান
    { width: 21 }, // C: রুম অবস্থা (খালি / ভাড়া আছে)
    { width: 22 }, // D: ভাড়াটিয়া
    { width: 13 }, // E: পূর্ববর্তী মিটার
    { width: 13 }, // F: বর্তমান মিটার
    { width: 13 }, // G: ব্যবহৃত ইউনিট
    { width: 11 }, // H: রেট
    { width: 14 }, // I: মূল ভাড়া
    { width: 14 }, // J: বিদ্যুৎ বিল
    { width: 13 }, // K: অন্যান্য
    { width: 13 }, // L: পূর্বের বকেয়া
    { width: 15 }, // M: সর্বমোট বিল
    { width: 15 }, // N: জমা / Paid
    { width: 15 }, // O: বকেয়া / Due
    { width: 16 }, // P: স্ট্যাটাস
    { width: 18 }, // Q: মাধ্যম ও তারিখ
  ];

  billsSheet.mergeCells('A1:Q1');
  const bTitle = billsSheet.getCell('A1');
  bTitle.value = `${settings.houseName || 'BariVara Pro'} — মাসিক ভাড়া ও বিদ্যুৎ বিলের হিসাব (Auto Formula)`;
  bTitle.font = { bold: true, size: 13, color: { argb: COLORS.white } };
  bTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate900 } };
  bTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  billsSheet.getRow(1).height = 28;

  billsSheet.mergeCells('A2:Q2');
  const bSub = billsSheet.getCell('A2');
  bSub.value = `C কলামে "${STATUS_EMPTY}" থাকলে ঐ রুমের সব ঘর খালি থাকবে; "${STATUS_FILLED}" সিলেক্ট করে রিডিং/ভাড়া লিখলে অটো হিসাব হবে।  |  তারিখ: ${today}`;
  bSub.font = { size: 10, color: { argb: COLORS.slate100 } };
  bSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  bSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  billsSheet.getRow(2).height = 22;

  const billHeaders = [
    'মাস',
    'রুম / দোকান',
    'রুম অবস্থা (অপশন)',
    'ভাড়াটিয়া',
    'পূর্ববর্তী মিটার',
    'বর্তমান মিটার',
    'ব্যবহৃত ইউনিট',
    'রেট (৳)',
    'মূল ভাড়া (৳)',
    'বিদ্যুৎ বিল (৳)',
    'অন্যান্য (৳)',
    'পূর্বের বকেয়া (৳)',
    'সর্বমোট বিল (৳)',
    'জমা / Paid (৳)',
    'বকেয়া / Due (৳)',
    'স্ট্যাটাস',
    'মাধ্যম ও তারিখ',
  ];
  const bHeadRow = billsSheet.addRow(billHeaders);
  bHeadRow.height = 24;
  bHeadRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate700 } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber >= 5 && colNumber <= 15 ? 'right' : 'left',
    };
    cell.border = THIN_BORDER;
  });

  billRowData.forEach((b, idx) => {
    const r = firstBillRowNum + idx;
    const predictedTotal =
      b.baseRent +
      Math.round(Math.max(0, b.currReading - b.prevReading) * b.unitRate) +
      b.otherCharge +
      b.prevDue;
    const isCleared = !b.isEmpty && predictedTotal > 0 && b.paidAmount >= predictedTotal;

    const row = billsSheet.addRow([
      null,
      b.unitName || null,
      b.isEmpty ? STATUS_EMPTY : STATUS_FILLED,
      null,
      null,
      null,
      {
        formula: `IF($C${r}="${STATUS_EMPTY}","",IF(AND(E${r}="",F${r}=""),"",IF(F${r}>E${r},F${r}-E${r},0)))`,
      },
      null,
      null,
      {
        formula: `IF($C${r}="${STATUS_EMPTY}","",IF(G${r}="","",ROUND(G${r}*H${r},0)))`,
      },
      null,
      null,
      {
        formula: `IF($C${r}="${STATUS_EMPTY}","",IF(AND(I${r}="",J${r}="",K${r}="",L${r}=""),"",SUM(I${r}:L${r})))`,
      },
      null,
      {
        formula: `IF($C${r}="${STATUS_EMPTY}","",IF(M${r}="","",IF(M${r}>N${r},M${r}-N${r},0)))`,
      },
      {
        formula: `IF($C${r}="${STATUS_EMPTY}","",IF(AND(M${r}="",N${r}=""),"",IF(O${r}=0,"ক্লিয়ার (Paid)","বকেয়া (Due)")))`,
      },
      null,
    ]);

    // Dropdown option on Column C (রুম অবস্থা)
    row.getCell(3).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${STATUS_EMPTY},${STATUS_FILLED}"`],
      showInputMessage: true,
      promptTitle: 'রুমের অবস্থা',
      prompt: `রুম খালি থাকলে "${STATUS_EMPTY}" সিলেক্ট করুন — সব ঘর খালি থাকবে। ভাড়া থাকলে "${STATUS_FILLED}" দিন।`,
    };

    if (!b.isEmpty) {
      // Filled room: wrap details in IF($C="খালি","",...) so switching to খালি empties every cell automatically
      row.getCell(1).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","","${escFormulaStr(b.monthLabel)}")`,
      };
      row.getCell(4).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","","${escFormulaStr(b.tenantName)}")`,
      };
      row.getCell(5).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","",${b.prevReading})`,
      };
      row.getCell(6).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","",${b.currReading})`,
      };
      row.getCell(8).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","",${b.unitRate})`,
      };
      row.getCell(9).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","",${b.baseRent})`,
      };
      row.getCell(11).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","",${b.otherCharge})`,
      };
      row.getCell(12).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","",${b.prevDue})`,
      };
      row.getCell(14).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","",${b.paidAmount})`,
      };
      row.getCell(17).value = {
        formula: `IF($C${r}="${STATUS_EMPTY}","","${escFormulaStr(b.payInfo)}")`,
      };
    }

    row.height = 22;
    const zebraBg = idx % 2 === 1 ? COLORS.slate50 : COLORS.white;
    for (let colNumber = 1; colNumber <= 17; colNumber++) {
      const cell = row.getCell(colNumber);
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber >= 5 && colNumber <= 15 ? 'right' : 'left',
      };
      if (colNumber >= 5 && colNumber <= 15) {
        cell.numFmt = colNumber === 7 || colNumber === 8 ? '#,##0.##' : '#,##0';
      }
      if (colNumber === 3) {
        cell.font = {
          bold: true,
          size: 10,
          color: { argb: b.isEmpty ? COLORS.amber800 : COLORS.emerald700 },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: b.isEmpty ? COLORS.amber50 : COLORS.emerald50 },
        };
      } else if (colNumber === 16) {
        cell.font = {
          bold: true,
          size: 10,
          color: {
            argb: b.isEmpty
              ? COLORS.slate700
              : isCleared
                ? COLORS.emerald700
                : COLORS.rose700,
          },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: b.isEmpty ? zebraBg : isCleared ? COLORS.emerald50 : COLORS.rose50,
          },
        };
      } else if (colNumber === 14) {
        cell.font = { bold: true, size: 10, color: { argb: COLORS.emerald700 } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
      } else if (colNumber === 15 && !isCleared && !b.isEmpty) {
        cell.font = { bold: true, size: 10, color: { argb: COLORS.rose700 } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
      } else {
        cell.font = { bold: colNumber === 13 || colNumber === 2, size: 10, color: { argb: COLORS.slate900 } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
      }
    }
  });

  // Conditional Formatting for Sheet 2 Status Columns (C & P)
  billsSheet.addConditionalFormatting({
    ref: `C${firstBillRowNum}:C${lastBillRowNum}`,
    rules: [
      {
        priority: 1,
        type: 'cellIs',
        operator: 'equal',
        formulae: [`"${STATUS_EMPTY}"`],
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.amber50 } },
          font: { bold: true, color: { argb: COLORS.amber800 } },
        },
      },
      {
        priority: 2,
        type: 'cellIs',
        operator: 'equal',
        formulae: [`"${STATUS_FILLED}"`],
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.emerald50 } },
          font: { bold: true, color: { argb: COLORS.emerald700 } },
        },
      },
    ],
  });

  billsSheet.addConditionalFormatting({
    ref: `P${firstBillRowNum}:P${lastBillRowNum}`,
    rules: [
      {
        priority: 1,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"ক্লিয়ার (Paid)"'],
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.emerald50 } },
          font: { bold: true, color: { argb: COLORS.emerald700 } },
        },
      },
      {
        priority: 2,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"বকেয়া (Due)"'],
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.rose50 } },
          font: { bold: true, color: { argb: COLORS.rose700 } },
        },
      },
    ],
  });

  const totalRow = billsSheet.addRow([
    'সর্বমোট (Total)',
    { formula: `COUNTA(B${firstBillRowNum}:B${lastBillRowNum})&" টি"` },
    {
      formula: `COUNTIF(C${firstBillRowNum}:C${lastBillRowNum},"${STATUS_FILLED}")&" ভাড়া / "&COUNTIF(C${firstBillRowNum}:C${lastBillRowNum},"${STATUS_EMPTY}")&" খালি"`,
    },
    '',
    '',
    '',
    { formula: `SUM(G${firstBillRowNum}:G${lastBillRowNum})` },
    '',
    { formula: `SUM(I${firstBillRowNum}:I${lastBillRowNum})` },
    { formula: `SUM(J${firstBillRowNum}:J${lastBillRowNum})` },
    { formula: `SUM(K${firstBillRowNum}:K${lastBillRowNum})` },
    { formula: `SUM(L${firstBillRowNum}:L${lastBillRowNum})` },
    { formula: `SUM(M${firstBillRowNum}:M${lastBillRowNum})` },
    { formula: `SUM(N${firstBillRowNum}:N${lastBillRowNum})` },
    { formula: `SUM(O${firstBillRowNum}:O${lastBillRowNum})` },
    '',
    '',
  ]);
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    cell.border = THIN_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber >= 5 && colNumber <= 15 ? 'right' : 'left',
    };
    if (colNumber >= 7 && colNumber <= 15) {
      cell.numFmt = colNumber === 7 ? '#,##0.##' : '#,##0';
    }
    cell.font = {
      bold: true,
      size: 11,
      color: {
        argb:
          colNumber === 14
            ? COLORS.emerald700
            : colNumber === 15
              ? COLORS.rose700
              : COLORS.slate900,
      },
    };
  });

  // ==================== SHEET 3: চলতি মাস বাকি তালিকা ====================
  const unpaidSheet = workbook.addWorksheet('চলতি মাস বাকি তালিকা', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  unpaidSheet.columns = [
    { width: 8 },
    { width: 18 },
    { width: 18 },
    { width: 24 },
    { width: 16 },
    { width: 28 },
    { width: 18 },
  ];

  unpaidSheet.mergeCells('A1:G1');
  const uTitle = unpaidSheet.getCell('A1');
  uTitle.value = `${formatBanglaMonth(currentMonth)} — চলতি মাসের অপরিশোধিত ভাড়ার তালিকা`;
  uTitle.font = { bold: true, size: 13, color: { argb: COLORS.white } };
  uTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate900 } };
  uTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  unpaidSheet.getRow(1).height = 28;

  unpaidSheet.mergeCells('A2:G2');
  const uSub = unpaidSheet.getCell('A2');
  uSub.value = `মোট বাকি ইউনিট: ${unpaidCurrentList.length}টি (পারিবারিক ও খালি রুম ব্যতীত)  |  তারিখ: ${today}`;
  uSub.font = { size: 10, color: { argb: COLORS.amber800 } };
  uSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amber50 } };
  uSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  unpaidSheet.getRow(2).height = 22;

  const uHead = unpaidSheet.addRow([
    'নং',
    'রুম / দোকান',
    'ফ্লোর',
    'ভাড়াটিয়ার নাম',
    'মোবাইল',
    'বাকি থাকার কারণ',
    'বকেয়া / প্রদেয় (৳)',
  ]);
  uHead.height = 23;
  uHead.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 7 ? 'right' : colNumber === 1 ? 'center' : 'left',
    };
    cell.border = THIN_BORDER;
  });

  if (unpaidCurrentList.length === 0) {
    const clearRow = unpaidSheet.addRow([
      '-',
      'সব পরিশোধিত!',
      '',
      'চলতি মাসের কোনো ভাড়া বাকি নেই',
      '',
      '',
      0,
    ]);
    unpaidSheet.mergeCells(clearRow.number, 4, clearRow.number, 6);
    clearRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: COLORS.emerald700 } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.emerald50 } };
      cell.border = THIN_BORDER;
    });
  } else {
    unpaidCurrentList.forEach((item, idx) => {
      const row = unpaidSheet.addRow([
        idx + 1,
        item.unit.name,
        item.unit.floor,
        item.tenant.name,
        item.tenant.phone,
        item.reasonText,
        item.dueAmount,
      ]);
      row.height = 21;
      row.eachCell((cell, colNumber) => {
        cell.border = THIN_BORDER;
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 7 ? 'right' : colNumber === 1 ? 'center' : 'left',
        };
        if (colNumber === 7) {
          cell.numFmt = '#,##0';
          cell.font = { bold: true, size: 10, color: { argb: COLORS.rose700 } };
        } else if (colNumber === 6) {
          cell.font = { bold: true, size: 10, color: { argb: COLORS.amber800 } };
        } else {
          cell.font = { size: 10, color: { argb: COLORS.slate900 } };
        }
      });
    });
  }

  // ==================== SHEET 4: ভাড়াটিয়াদের তালিকা ====================
  const tenantsSheet = workbook.addWorksheet('ভাড়াটিয়াদের তালিকা', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  tenantsSheet.columns = [
    { width: 13 },
    { width: 15 },
    { width: 22 },
    { width: 18 },
    { width: 15 },
    { width: 15 },
    { width: 28 },
    { width: 14 },
    { width: 14 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
    { width: 18 },
    { width: 24 },
  ];

  tenantsSheet.mergeCells('A1:N1');
  const tTitle = tenantsSheet.getCell('A1');
  tTitle.value = `${settings.houseName || 'BariVara Pro'} — সকল ভাড়াটিয়ার তালিকা`;
  tTitle.font = { bold: true, size: 13, color: { argb: COLORS.white } };
  tTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate900 } };
  tTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  tenantsSheet.getRow(1).height = 28;

  tenantsSheet.mergeCells('A2:N2');
  const tSub = tenantsSheet.getCell('A2');
  tSub.value = `সক্রিয়: ${tenants.filter((t) => !t.outDate).length} জন  |  পূর্ববর্তী: ${
    tenants.filter((t) => Boolean(t.outDate)).length
  } জন  |  তারিখ: ${today}`;
  tSub.font = { size: 10, color: { argb: COLORS.slate100 } };
  tSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  tSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  tenantsSheet.getRow(2).height = 20;

  const tHead = tenantsSheet.addRow([
    'অবস্থা',
    'রুম / দোকান',
    'ভাড়াটিয়ার নাম',
    'পেশা / ধরন',
    'নিজের মোবাইল',
    'পরিবারের মোবাইল',
    'স্থায়ী ঠিকানা',
    'মাসিক ভাড়া (৳)',
    'অগ্রিম (৳)',
    'ওঠার তারিখ',
    'ছাড়ার তারিখ',
    'শুরুর মিটার',
    'NID নম্বর',
    'সাথে থাকা সদস্য',
  ]);
  tHead.height = 24;
  tHead.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate700 } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 8 || colNumber === 9 || colNumber === 12 ? 'right' : 'left',
    };
    cell.border = THIN_BORDER;
  });

  const sortedTenants = [...tenants].sort((a, b) => {
    const aPast = Boolean(a.outDate) ? 1 : 0;
    const bPast = Boolean(b.outDate) ? 1 : 0;
    if (aPast !== bPast) return aPast - bPast;
    const uA = unitMap.get(a.unitId)?.sortOrder ?? 999;
    const uB = unitMap.get(b.unitId)?.sortOrder ?? 999;
    return uA - uB;
  });

  sortedTenants.forEach((t, idx) => {
    const u = unitMap.get(t.unitId);
    const isActive = !t.outDate;
    const members = [...(t.familyStandard || []), ...(t.familyCustom || [])].join(', ') || 'একা';
    const row = tenantsSheet.addRow([
      isActive ? 'সক্রিয়' : 'চলে গেছেন',
      u?.name || '-',
      t.name,
      t.occupation || '-',
      t.phone,
      t.familyPhone || '-',
      t.homeAddress || '-',
      Number(t.rent || 0),
      Number(t.advance || 0),
      t.inDate || '-',
      t.outDate || 'চলমান',
      Number(t.initialMeter || 0),
      t.nidNumber || '-',
      members,
    ]);
    row.height = 21;
    const zebraBg = idx % 2 === 1 ? COLORS.slate50 : COLORS.white;
    row.eachCell((cell, colNumber) => {
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 8 || colNumber === 9 || colNumber === 12 ? 'right' : 'left',
      };
      if (colNumber === 8 || colNumber === 9 || colNumber === 12) {
        cell.numFmt = '#,##0';
      }
      if (colNumber === 1) {
        cell.font = {
          bold: true,
          size: 10,
          color: { argb: isActive ? COLORS.emerald700 : COLORS.slate700 },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isActive ? COLORS.emerald50 : COLORS.slate100 },
        };
      } else {
        cell.font = { bold: colNumber === 3, size: 10, color: { argb: COLORS.slate900 } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BariVara_Pro_Full_Excel_${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
