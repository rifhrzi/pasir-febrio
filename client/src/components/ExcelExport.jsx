import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config.js';

/**
 * Export data to Excel with PT Dzikry Multi Laba template format
 * Uses server-side template for proper formatting
 */

// Server-side export using template
export const exportFromServer = async (type = 'all', format = 'xlsx') => {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/export/${type}?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    a.download = `PT_Dzikry_${type}_${dateStr}.${format}`;
    
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return a.download;
  } catch (error) {
    console.error('Server export error:', error);
    throw error;
  }
};

const formatCurrencyNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const formatDateForExcel = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getDayName = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
};

// Parse income description JSON
const parseIncomeDescription = (description) => {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description);
    if (parsed && parsed.__type === 'income-v1') return parsed;
  } catch {
    return null;
  }
  return null;
};

// Create header row with styling info
const createIncomeHeader = () => [
  'NO',
  'DATE',
  'DAY',
  'PRODUCT NAME',
  'QTY',
  'PRICE',
  'TOTAL',
  'LOADING',
  'MARKET',
  'DO',
  'TOTAL BAYAR'
];

const createExpenseHeader = () => [
  'NO',
  'DATE',
  'DAY',
  'CATEGORY',
  'DESCRIPTION',
  'AMOUNT'
];

// Transform income data to Excel row
const incomeToRow = (item, index, parseDescription = true) => {
  const parsed = parseDescription ? parseIncomeDescription(item.description) : null;
  
  if (parsed) {
    const qty = parsed.quantity || 1;
    const unitPrice = parsed.unitPrice || 0;
    const gross = parsed.gross || (qty * unitPrice);
    const loading = (parsed.perLoadDeductions?.loading || 0) * qty;
    const market = (parsed.perLoadDeductions?.market || 0) * qty;
    const doFee = (parsed.perLoadDeductions?.broker || 0) * qty;
    const net = parsed.net || item.amount;
    
    return [
      index + 1,
      formatDateForExcel(item.trans_date),
      getDayName(item.trans_date),
      parsed.productLabel || item.category,
      qty,
      unitPrice,
      gross,
      loading,
      market,
      doFee,
      net
    ];
  }
  
  // Fallback for items without parsed description
  return [
    index + 1,
    formatDateForExcel(item.trans_date),
    getDayName(item.trans_date),
    item.category || '',
    1,
    formatCurrencyNumber(item.amount),
    formatCurrencyNumber(item.amount),
    0,
    0,
    0,
    formatCurrencyNumber(item.amount)
  ];
};

// Transform expense data to Excel row
const expenseToRow = (item, index) => {
  return [
    index + 1,
    formatDateForExcel(item.trans_date),
    getDayName(item.trans_date),
    item.category || '',
    item.description || '',
    formatCurrencyNumber(item.amount)
  ];
};

// Calculate totals row for income
const createIncomeTotalsRow = (data) => {
  let totalQty = 0, totalGross = 0, totalLoading = 0, totalMarket = 0, totalDO = 0, totalNet = 0;
  
  data.forEach(item => {
    const parsed = parseIncomeDescription(item.description);
    if (parsed) {
      const qty = parsed.quantity || 1;
      totalQty += qty;
      totalGross += parsed.gross || 0;
      totalLoading += (parsed.perLoadDeductions?.loading || 0) * qty;
      totalMarket += (parsed.perLoadDeductions?.market || 0) * qty;
      totalDO += (parsed.perLoadDeductions?.broker || 0) * qty;
      totalNet += parsed.net || item.amount;
    } else {
      totalQty += 1;
      totalGross += formatCurrencyNumber(item.amount);
      totalNet += formatCurrencyNumber(item.amount);
    }
  });
  
  return ['', 'TOTAL', '', '', totalQty, '', totalGross, totalLoading, totalMarket, totalDO, totalNet];
};

// Calculate totals row for expense
const createExpenseTotalsRow = (data) => {
  const total = data.reduce((sum, item) => sum + formatCurrencyNumber(item.amount), 0);
  return ['', 'TOTAL', '', '', '', total];
};

// Style column widths
const setColumnWidths = (ws, type = 'income') => {
  if (type === 'income') {
    ws['!cols'] = [
      { wch: 5 },   // NO
      { wch: 12 },  // DATE
      { wch: 10 },  // DAY
      { wch: 20 },  // PRODUCT NAME
      { wch: 6 },   // QTY
      { wch: 15 },  // PRICE
      { wch: 15 },  // TOTAL
      { wch: 12 },  // LOADING
      { wch: 12 },  // MARKET
      { wch: 12 },  // DO
      { wch: 15 }   // TOTAL BAYAR
    ];
  } else {
    ws['!cols'] = [
      { wch: 5 },   // NO
      { wch: 12 },  // DATE
      { wch: 10 },  // DAY
      { wch: 15 },  // CATEGORY
      { wch: 30 },  // DESCRIPTION
      { wch: 15 }   // AMOUNT
    ];
  }
};

/**
 * Export incomes to Excel with TRONTON and COLTDIESEL sheets
 */
export const exportIncomesToExcel = (incomes, filename = 'Income_Export') => {
  const wb = XLSX.utils.book_new();
  
  // Separate data by truck type
  const trontonData = [];
  const coltDieselData = [];
  const otherData = [];
  
  incomes.forEach(item => {
    const parsed = parseIncomeDescription(item.description);
    const category = (item.category || '').toLowerCase();
    const truckKey = parsed?.truckKey || '';
    
    if (truckKey === 'tronton' || category.includes('tronton')) {
      trontonData.push(item);
    } else if (truckKey === 'colt' || category.includes('colt')) {
      coltDieselData.push(item);
    } else {
      otherData.push(item);
    }
  });
  
  // Create TRONTON sheet
  if (trontonData.length > 0 || coltDieselData.length === 0) {
    const trontonRows = [
      ['PT DZIKRY MULTI LABA'],
      ['INCOME - TRONTON'],
      [],
      createIncomeHeader(),
      ...trontonData.map((item, idx) => incomeToRow(item, idx)),
      [],
      createIncomeTotalsRow(trontonData)
    ];
    const wsTronton = XLSX.utils.aoa_to_sheet(trontonRows);
    setColumnWidths(wsTronton, 'income');
    
    // Merge title cells
    wsTronton['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
    ];
    
    XLSX.utils.book_append_sheet(wb, wsTronton, 'TRONTON');
  }
  
  // Create COLTDIESEL sheet
  if (coltDieselData.length > 0) {
    const coltRows = [
      ['PT DZIKRY MULTI LABA'],
      ['INCOME - COLT DIESEL'],
      [],
      createIncomeHeader(),
      ...coltDieselData.map((item, idx) => incomeToRow(item, idx)),
      [],
      createIncomeTotalsRow(coltDieselData)
    ];
    const wsColt = XLSX.utils.aoa_to_sheet(coltRows);
    setColumnWidths(wsColt, 'income');
    
    wsColt['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
    ];
    
    XLSX.utils.book_append_sheet(wb, wsColt, 'COLTDIESEL');
  }
  
  // Create OTHER sheet if there's unclassified data
  if (otherData.length > 0) {
    const otherRows = [
      ['PT DZIKRY MULTI LABA'],
      ['INCOME - OTHER'],
      [],
      createIncomeHeader(),
      ...otherData.map((item, idx) => incomeToRow(item, idx)),
      [],
      createIncomeTotalsRow(otherData)
    ];
    const wsOther = XLSX.utils.aoa_to_sheet(otherRows);
    setColumnWidths(wsOther, 'income');
    
    wsOther['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
    ];
    
    XLSX.utils.book_append_sheet(wb, wsOther, 'LAINNYA');
  }
  
  // Generate filename with date
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const fullFilename = `${filename}_${dateStr}.xlsx`;
  
  XLSX.writeFile(wb, fullFilename);
  return fullFilename;
};

/**
 * Export expenses to Excel with EXPANDING sheet
 */
export const exportExpensesToExcel = (expenses, filename = 'Expense_Export') => {
  const wb = XLSX.utils.book_new();
  
  const expenseRows = [
    ['PT DZIKRY MULTI LABA'],
    ['PENGELUARAN / EXPANDING'],
    [],
    createExpenseHeader(),
    ...expenses.map((item, idx) => expenseToRow(item, idx)),
    [],
    createExpenseTotalsRow(expenses)
  ];
  
  const wsExpense = XLSX.utils.aoa_to_sheet(expenseRows);
  setColumnWidths(wsExpense, 'expense');
  
  wsExpense['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
  ];
  
  XLSX.utils.book_append_sheet(wb, wsExpense, 'EXPANDING');
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const fullFilename = `${filename}_${dateStr}.xlsx`;
  
  XLSX.writeFile(wb, fullFilename);
  return fullFilename;
};

/**
 * Export complete report (Income + Expense) to Excel
 */
export const exportCompleteReport = (incomes, expenses, filename = 'Complete_Report') => {
  const wb = XLSX.utils.book_new();
  
  // Separate income data by truck type
  const trontonData = [];
  const coltDieselData = [];
  const otherIncomeData = [];
  
  incomes.forEach(item => {
    const parsed = parseIncomeDescription(item.description);
    const category = (item.category || '').toLowerCase();
    const truckKey = parsed?.truckKey || '';
    
    if (truckKey === 'tronton' || category.includes('tronton')) {
      trontonData.push(item);
    } else if (truckKey === 'colt' || category.includes('colt')) {
      coltDieselData.push(item);
    } else {
      otherIncomeData.push(item);
    }
  });
  
  // Calculate totals
  const totalIncome = incomes.reduce((sum, item) => sum + formatCurrencyNumber(item.amount), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + formatCurrencyNumber(item.amount), 0);
  const netProfit = totalIncome - totalExpense;
  
  // Create SUMMARY sheet
  const summaryRows = [
    ['PT DZIKRY MULTI LABA'],
    ['LAPORAN KEUANGAN'],
    [],
    ['RINGKASAN'],
    [],
    ['Keterangan', 'Jumlah'],
    ['Total Pemasukan', totalIncome],
    ['  - Tronton', trontonData.reduce((s, i) => s + formatCurrencyNumber(i.amount), 0)],
    ['  - Colt Diesel', coltDieselData.reduce((s, i) => s + formatCurrencyNumber(i.amount), 0)],
    ['  - Lainnya', otherIncomeData.reduce((s, i) => s + formatCurrencyNumber(i.amount), 0)],
    [],
    ['Total Pengeluaran', totalExpense],
    [],
    ['LABA BERSIH', netProfit]
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'SUMMARY');
  
  // Create TRONTON sheet
  if (trontonData.length > 0) {
    const trontonRows = [
      ['PT DZIKRY MULTI LABA'],
      ['INCOME - TRONTON'],
      [],
      createIncomeHeader(),
      ...trontonData.map((item, idx) => incomeToRow(item, idx)),
      [],
      createIncomeTotalsRow(trontonData)
    ];
    const wsTronton = XLSX.utils.aoa_to_sheet(trontonRows);
    setColumnWidths(wsTronton, 'income');
    wsTronton['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
    ];
    XLSX.utils.book_append_sheet(wb, wsTronton, 'TRONTON');
  }
  
  // Create COLTDIESEL sheet
  if (coltDieselData.length > 0) {
    const coltRows = [
      ['PT DZIKRY MULTI LABA'],
      ['INCOME - COLT DIESEL'],
      [],
      createIncomeHeader(),
      ...coltDieselData.map((item, idx) => incomeToRow(item, idx)),
      [],
      createIncomeTotalsRow(coltDieselData)
    ];
    const wsColt = XLSX.utils.aoa_to_sheet(coltRows);
    setColumnWidths(wsColt, 'income');
    wsColt['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
    ];
    XLSX.utils.book_append_sheet(wb, wsColt, 'COLTDIESEL');
  }
  
  // Create LAINNYA sheet for other income
  if (otherIncomeData.length > 0) {
    const otherRows = [
      ['PT DZIKRY MULTI LABA'],
      ['INCOME - LAINNYA'],
      [],
      createIncomeHeader(),
      ...otherIncomeData.map((item, idx) => incomeToRow(item, idx)),
      [],
      createIncomeTotalsRow(otherIncomeData)
    ];
    const wsOther = XLSX.utils.aoa_to_sheet(otherRows);
    setColumnWidths(wsOther, 'income');
    wsOther['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
    ];
    XLSX.utils.book_append_sheet(wb, wsOther, 'LAINNYA');
  }
  
  // Create EXPANDING (Expense) sheet
  if (expenses.length > 0) {
    const expenseRows = [
      ['PT DZIKRY MULTI LABA'],
      ['PENGELUARAN / EXPANDING'],
      [],
      createExpenseHeader(),
      ...expenses.map((item, idx) => expenseToRow(item, idx)),
      [],
      createExpenseTotalsRow(expenses)
    ];
    const wsExpense = XLSX.utils.aoa_to_sheet(expenseRows);
    setColumnWidths(wsExpense, 'expense');
    wsExpense['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
    ];
    XLSX.utils.book_append_sheet(wb, wsExpense, 'EXPANDING');
  }
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const fullFilename = `${filename}_${dateStr}.xlsx`;
  
  XLSX.writeFile(wb, fullFilename);
  return fullFilename;
};

/**
 * Export Button Component
 */
export default function ExportButton({ 
  onClick, 
  loading = false, 
  colorScheme = 'emerald',
  children = 'Export Excel'
}) {
  const colorClasses = {
    emerald: 'from-emerald-600 to-teal-600 shadow-emerald-600/20',
    rose: 'from-rose-600 to-pink-600 shadow-rose-600/20',
    blue: 'from-blue-600 to-indigo-600 shadow-blue-600/20',
    amber: 'from-amber-600 to-orange-600 shadow-amber-600/20'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${colorClasses[colorScheme] || colorClasses.emerald} text-white text-sm font-semibold shadow-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      {children}
    </button>
  );
}

