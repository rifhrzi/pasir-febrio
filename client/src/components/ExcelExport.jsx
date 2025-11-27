import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config.js';

/**
 * Export data to Excel with PT Dzikry Multi Laba template format
 * Matches the template structure:
 * - BIAYA OPERASIONAL DAN PRODUKSI
 * - Summary (Pengeluaran, Pendapatan, Sisa Kas)
 * - Catatan Hutang
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

const formatNumber = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString('id-ID');
};

const formatRupiah = (value) => {
  return `Rp ${formatNumber(value)}`;
};

const formatDateIndonesian = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 
                  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const sumAmount = (items) => {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
};

/**
 * Export complete report matching the template structure
 */
export const exportCompleteReport = (incomes = [], expenses = [], loans = [], filename = 'Laporan_Keuangan') => {
  const wb = XLSX.utils.book_new();
  
  // Calculate totals
  const totalIncome = sumAmount(incomes);
  const totalExpense = sumAmount(expenses);
  const totalLoans = sumAmount(loans);
  const sisaPendapatan = totalIncome - totalExpense;
  const sisaKas = sisaPendapatan - totalLoans;
  
  // Get date range
  const allDates = [...incomes, ...expenses, ...loans]
    .map(r => r.trans_date)
    .filter(d => d)
    .sort();
  const startDate = allDates.length > 0 ? formatDateIndonesian(allDates[0]) : '-';
  const endDate = allDates.length > 0 ? formatDateIndonesian(allDates[allDates.length - 1]) : '-';

  // Build the sheet data matching template structure
  const data = [];
  
  // Row 1: Title
  data.push(['BIAYA OPERASIONAL DAN PRODUKSI CIMANGGU', '', '', '', '', '', '', '']);
  
  // Row 2: Date range
  data.push([`${startDate} - ${endDate}`, '', '', '', '', '', '', '']);
  
  // Row 3: Total Pendapatan
  data.push([`PENDAPATAN ${formatRupiah(totalIncome)}`, '', '', '', '', '', '', '']);
  
  // Row 4: Headers
  data.push(['NO', 'KOMPONEN BIAYA OPERASIONAL DAN PRODUKSI', 'SATUAN', '', '', 'VOL', 'SATUAN (RP)', 'JUMLAH (RP)']);
  
  // Row 5: Sub-headers
  data.push(['', '', 'DT', 'TRON', 'PICK UP', '', '', '']);
  
  // Expense rows with summary on right
  const expenseRows = Math.max(expenses.length, 3); // At least 3 rows
  for (let i = 0; i < expenseRows; i++) {
    const exp = expenses[i];
    const row = [
      exp ? i + 1 : '',
      exp ? `${exp.category || ''}${exp.description ? ' - ' + exp.description : ''}` : '',
      '', '', '', '', '',
      exp ? formatNumber(exp.amount || 0) : ''
    ];
    
    // Add summary on right side for first 3 rows
    if (i === 0) {
      row.push(''); row.push('Pengeluaran'); row.push(formatNumber(totalExpense));
    } else if (i === 1) {
      row.push(''); row.push('Pendapatan'); row.push(formatNumber(totalIncome));
    } else if (i === 2) {
      row.push(''); row.push('Pendapatan'); row.push(formatNumber(sisaPendapatan));
    }
    
    data.push(row);
  }
  
  // Catatan Hutang 1 header
  data.push(['', 'Catatan Hutang 1 (Yang belum dibayar):', '', '', '', '', '', '']);
  
  // Loan items
  if (loans.length === 0) {
    data.push(['', '1. Tidak ada hutang', 'Rp 0', '', '', '', '', '']);
  } else {
    loans.forEach((loan, idx) => {
      data.push([
        '',
        `${idx + 1}. ${loan.category || 'Hutang'}${loan.description ? ' - ' + loan.description : ''}`,
        formatRupiah(loan.amount || 0),
        '', '', '', '', ''
      ]);
    });
  }
  
  // Total Hutang
  data.push(['', 'Total Hutang', '', '', '', '', '', '']);
  
  // Empty row
  data.push(['', '', '', '', '', '', '', '']);
  
  // Catatan section on right
  data.push(['', '', '', '', '', '', 'Catatan', 'Catatan Pembahasan 2', '', '']);
  data.push(['', '', '', '', '', '', 'Catatan', 'Catatan Beban HO 3', '', '']);
  
  // Catatan Pembahasan 2
  data.push(['', 'Catatan Pembahasan 2:', '', '', '', '', 'Jumlah', 'Jumlah', '', '']);
  data.push(['', '1. Dana Deposit Royalti dari HM...?', '', '', '', '', 'Sisa Kas', 'Sisa Kas', formatNumber(sisaKas), '']);
  data.push(['', '2. Dana dari Pak Rizal ke HM...?', '', '', '', '', '', '', '', '']);
  data.push(['', '3. Dana Pembayaran Tanah ...?', '', '', '', '', 'Catatan', 'Catatan Hutang 1', '', '']);
  
  // Pengeluaran section
  data.push(['', 'Pengeluaran', formatNumber(totalExpense), '', '', '', '', '', '', '']);
  data.push(['', '5. Gaji Security CBB', '', '', '', '', '', '', '', '']);
  data.push(['', '6. Dana transfer ke HM ...?', '', '', '', '', '', '', '', '']);
  data.push(['', '7. Discouunto ke Pak Alif....?', '', '', '', '', '', '', '', '']);
  data.push(['', 'Total', '', '', '', '', '', '', '', '']);
  
  // Empty row
  data.push(['', '', '', '', '', '', '', '', '', '']);
  
  // Catatan Beban HO 3
  data.push(['', 'Catatan Beban HO 3:', '', '', '', '', '', '', '', '']);
  data.push(['', '1. 3 galon meditran', 'Rp', formatNumber(1140000), '', '', '', '', '', '']);
  data.push(['', '2. 1 galon meditran', 'Rp', formatNumber(528000), '', '', '', '', '', '']);
  data.push(['', 'Total', '', formatNumber(1668000), '', '', '', '', '', '']);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 5 },   // A - NO
    { wch: 45 },  // B - KOMPONEN
    { wch: 12 },  // C - SATUAN DT
    { wch: 12 },  // D - TRON
    { wch: 12 },  // E - PICK UP
    { wch: 8 },   // F - VOL
    { wch: 12 },  // G - SATUAN (RP)
    { wch: 15 },  // H - JUMLAH (RP)
    { wch: 12 },  // I
    { wch: 15 },  // J
    { wch: 15 },  // K
  ];
  
  // Merge cells for title rows
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Row 1 title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Row 2 date
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // Row 3 pendapatan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Table 1');
  
  // Generate filename with date
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const fullFilename = `${filename}_${dateStr}.xlsx`;
  
  XLSX.writeFile(wb, fullFilename);
  return fullFilename;
};

/**
 * Export incomes only
 */
export const exportIncomesToExcel = (incomes, filename = 'Income_Export') => {
  return exportCompleteReport(incomes, [], [], filename);
};

/**
 * Export expenses only  
 */
export const exportExpensesToExcel = (expenses, filename = 'Expense_Export') => {
  return exportCompleteReport([], expenses, [], filename);
};

/**
 * Export loans only
 */
export const exportLoansToExcel = (loans, filename = 'Loans_Export') => {
  return exportCompleteReport([], [], loans, filename);
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
