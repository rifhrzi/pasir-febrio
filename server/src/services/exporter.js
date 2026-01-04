import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../db.js';

const DEFAULT_TEMPLATE_PATH = path.resolve(process.cwd(), 'templates', 'export_template.xlsx');

export async function exportData({ type = 'all', format = 'xlsx', templatePath }) {
  const sections = [];
  if (type === 'incomes' || type === 'all') {
    const { rows } = await query('SELECT * FROM incomes ORDER BY trans_date DESC');
    sections.push({ name: 'Incomes', rows });
  }
  if (type === 'expenses' || type === 'all') {
    const { rows } = await query('SELECT * FROM expenses ORDER BY trans_date DESC');
    sections.push({ name: 'Expenses', rows });
  }
  if (type === 'loans' || type === 'all') {
    const { rows } = await query('SELECT * FROM loans ORDER BY trans_date DESC');
    sections.push({ name: 'Loans', rows });
  }

  if (format === 'xlsx') {
    return await buildCompleteExcel(sections);
  }
  if (format === 'pdf') {
    return await buildPdf(sections);
  }
  throw new Error('Unsupported format');
}

/**
 * Build complete Excel with ALL data matching website display
 * Creates multiple sheets:
 * 1. SUMMARY - Overview like Dashboard
 * 2. PENDAPATAN - All income transactions
 * 3. PENGELUARAN - All expense transactions  
 * 4. PINJAMAN - All loan transactions
 */
async function buildCompleteExcel(sections) {
  const workbook = new ExcelJS.Workbook();
  
  const incomes = findSection(sections, 'Incomes');
  const expenses = findSection(sections, 'Expenses');
  const loans = findSection(sections, 'Loans');
  
  // Calculate totals
  const totalIncome = sumRows(incomes);
  const totalExpense = sumRows(expenses);
  const totalLoans = sumRows(loans);
  const sisaPendapatan = totalIncome - totalExpense;
  const sisaKas = sisaPendapatan - totalLoans;
  
  // Get date range
  const allDates = [...incomes, ...expenses, ...loans]
    .map(r => r.trans_date)
    .filter(d => d)
    .sort();
  const startDate = allDates.length > 0 ? formatDateIndonesian(allDates[0]) : '-';
  const endDate = allDates.length > 0 ? formatDateIndonesian(allDates[allDates.length - 1]) : '-';

  // Group by category
  const incomeByCategory = groupByCategory(incomes);
  const expenseByCategory = groupByCategory(expenses);

  // Sheet 1: SUMMARY
  createSummarySheet(workbook, {
    totalIncome,
    totalExpense,
    totalLoans,
    sisaPendapatan,
    sisaKas,
    startDate,
    endDate,
    incomeByCategory,
    expenseByCategory,
    loans
  });

  // Sheet 2: PENDAPATAN (ALL income transactions)
  createDataSheet(workbook, 'PENDAPATAN', incomes, {
    title: 'LAPORAN PENDAPATAN',
    subtitle: `${startDate} - ${endDate}`,
    total: totalIncome,
    color: '92D050' // Green
  });

  // Sheet 3: PENGELUARAN (ALL expense transactions)
  createDataSheet(workbook, 'PENGELUARAN', expenses, {
    title: 'LAPORAN PENGELUARAN',
    subtitle: `${startDate} - ${endDate}`,
    total: totalExpense,
    color: 'FFC000' // Orange
  });

  // Sheet 4: PINJAMAN (ALL loan transactions)
  createDataSheet(workbook, 'PINJAMAN', loans, {
    title: 'LAPORAN PINJAMAN / HUTANG',
    subtitle: `${startDate} - ${endDate}`,
    total: totalLoans,
    color: 'FF6B6B' // Red
  });

  return workbook.xlsx.writeBuffer();
}

function createSummarySheet(workbook, data) {
  const { totalIncome, totalExpense, totalLoans, sisaPendapatan, sisaKas, startDate, endDate, incomeByCategory, expenseByCategory, loans } = data;
  
  const sheet = workbook.addWorksheet('SUMMARY');
  
  // Column widths
  sheet.columns = [
    { width: 5 },
    { width: 45 },
    { width: 20 },
    { width: 5 },
    { width: 25 },
    { width: 20 },
  ];

  // Row 1: Title
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'LAPORAN KEUANGAN PT. DZIKRY MULTI LABA';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getRow(1).height = 30;

  // Row 2: Date range
  sheet.mergeCells('A2:F2');
  const dateCell = sheet.getCell('A2');
  dateCell.value = `Periode: ${startDate} - ${endDate}`;
  dateCell.font = { bold: true, size: 12 };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 4: Summary Header
  let row = 4;
  sheet.mergeCells(`A${row}:C${row}`);
  sheet.getCell(`A${row}`).value = 'RINGKASAN KEUANGAN';
  sheet.getCell(`A${row}`).font = { bold: true, size: 14 };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
  
  sheet.mergeCells(`E${row}:F${row}`);
  sheet.getCell(`E${row}`).value = 'REKAP';
  sheet.getCell(`E${row}`).font = { bold: true, size: 14 };
  sheet.getCell(`E${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };

  // Summary items
  row = 5;
  const summaryItems = [
    ['Total Pendapatan', totalIncome, '92D050'],
    ['Total Pengeluaran', totalExpense, 'FFC000'],
    ['Total Pinjaman', totalLoans, 'FF6B6B'],
    ['Sisa Pendapatan', sisaPendapatan, '00B0F0'],
    ['Sisa Kas', sisaKas, sisaKas >= 0 ? '92D050' : 'FF0000'],
  ];

  summaryItems.forEach(([label, value, color], idx) => {
    sheet.getCell(`B${row + idx}`).value = label;
    sheet.getCell(`B${row + idx}`).font = { bold: true };
    sheet.getCell(`C${row + idx}`).value = `Rp ${formatNumber(value)}`;
    sheet.getCell(`C${row + idx}`).font = { bold: true, color: { argb: `FF${color}` } };
    sheet.getCell(`C${row + idx}`).alignment = { horizontal: 'right' };
  });

  // Right side: Category breakdown
  row = 5;
  sheet.getCell(`E${row}`).value = 'Pendapatan:';
  sheet.getCell(`E${row}`).font = { bold: true };
  row++;
  
  Object.entries(incomeByCategory).sort((a, b) => b[1].total - a[1].total).forEach(([cat, data]) => {
    sheet.getCell(`E${row}`).value = `  ${cat}`;
    sheet.getCell(`F${row}`).value = `Rp ${formatNumber(data.total)}`;
    sheet.getCell(`F${row}`).alignment = { horizontal: 'right' };
    row++;
  });

  row++;
  sheet.getCell(`E${row}`).value = 'Pengeluaran:';
  sheet.getCell(`E${row}`).font = { bold: true };
  row++;

  Object.entries(expenseByCategory).sort((a, b) => b[1].total - a[1].total).forEach(([cat, data]) => {
    sheet.getCell(`E${row}`).value = `  ${cat}`;
    sheet.getCell(`F${row}`).value = `Rp ${formatNumber(data.total)}`;
    sheet.getCell(`F${row}`).alignment = { horizontal: 'right' };
    row++;
  });

  // Catatan Hutang section
  row = 12;
  sheet.getCell(`A${row}`).value = '';
  sheet.getCell(`B${row}`).value = 'CATATAN HUTANG (Yang belum dibayar):';
  sheet.getCell(`B${row}`).font = { bold: true };
  sheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  row++;

  if (loans.length === 0) {
    sheet.getCell(`B${row}`).value = '  Tidak ada hutang';
    sheet.getCell(`C${row}`).value = 'Rp 0';
  } else {
    loans.forEach((loan, idx) => {
      sheet.getCell(`B${row}`).value = `  ${idx + 1}. ${loan.category || 'Pinjaman'} - ${(loan.description || '').substring(0, 35)}`;
      sheet.getCell(`C${row}`).value = `Rp ${formatNumber(loan.amount)}`;
      sheet.getCell(`C${row}`).alignment = { horizontal: 'right' };
      row++;
    });
  }

  row++;
  sheet.getCell(`B${row}`).value = 'TOTAL HUTANG';
  sheet.getCell(`B${row}`).font = { bold: true };
  sheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`C${row}`).value = `Rp ${formatNumber(totalLoans)}`;
  sheet.getCell(`C${row}`).font = { bold: true };
  sheet.getCell(`C${row}`).alignment = { horizontal: 'right' };
}

function createDataSheet(workbook, sheetName, data, options) {
  const { title, subtitle, total, color } = options;
  const sheet = workbook.addWorksheet(sheetName);

  // Column widths
  sheet.columns = [
    { width: 5 },   // NO
    { width: 15 },  // TANGGAL
    { width: 15 },  // KATEGORI
    { width: 50 },  // DESKRIPSI
    { width: 20 },  // JUMLAH
  ];

  // Row 1: Title
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
  sheet.getRow(1).height = 25;

  // Row 2: Date range
  sheet.mergeCells('A2:E2');
  const dateCell = sheet.getCell('A2');
  dateCell.value = subtitle;
  dateCell.font = { bold: true };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 3: Total
  sheet.mergeCells('A3:E3');
  const totalCell = sheet.getCell('A3');
  totalCell.value = `TOTAL: Rp ${formatNumber(total)}`;
  totalCell.font = { bold: true, size: 12 };
  totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };

  // Row 5: Headers
  const headers = ['NO', 'TANGGAL', 'KATEGORI', 'DESKRIPSI', 'JUMLAH (RP)'];
  headers.forEach((h, idx) => {
    const cell = sheet.getCell(5, idx + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Data rows
  data.forEach((item, idx) => {
    const rowNum = 6 + idx;
    const row = sheet.getRow(rowNum);

    // NO
    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center' };

    // TANGGAL
    const date = item.trans_date ? new Date(item.trans_date) : null;
    row.getCell(2).value = date ? formatDateShort(date) : '-';
    row.getCell(2).alignment = { horizontal: 'center' };

    // KATEGORI
    row.getCell(3).value = item.category || '-';

    // DESKRIPSI
    row.getCell(4).value = item.description || '-';

    // JUMLAH
    row.getCell(5).value = `Rp ${formatNumber(item.amount)}`;
    row.getCell(5).alignment = { horizontal: 'right' };

    // Borders
    for (let c = 1; c <= 5; c++) {
      row.getCell(c).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Alternate row colors
    if (idx % 2 === 1) {
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    }
  });

  // Total row at the end
  const totalRowNum = 6 + data.length;
  sheet.mergeCells(`A${totalRowNum}:D${totalRowNum}`);
  sheet.getCell(`A${totalRowNum}`).value = 'TOTAL';
  sheet.getCell(`A${totalRowNum}`).font = { bold: true };
  sheet.getCell(`A${totalRowNum}`).alignment = { horizontal: 'right' };
  sheet.getCell(`A${totalRowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  
  sheet.getCell(`E${totalRowNum}`).value = `Rp ${formatNumber(total)}`;
  sheet.getCell(`E${totalRowNum}`).font = { bold: true };
  sheet.getCell(`E${totalRowNum}`).alignment = { horizontal: 'right' };
  sheet.getCell(`E${totalRowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

  for (let c = 1; c <= 5; c++) {
    sheet.getCell(totalRowNum, c).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
}

function groupByCategory(items) {
  const result = {};
  items.forEach(item => {
    const cat = (item.category || 'LAINNYA').toUpperCase();
    if (!result[cat]) {
      result[cat] = { items: [], total: 0 };
    }
    result[cat].items.push(item);
    result[cat].total += Number(item.amount || 0);
  });
  return result;
}

function findSection(sections, name) {
  return sections.find(section => section.name === name)?.rows || [];
}

function buildPdf(data) {
  return new Promise(resolve => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    data.forEach(section => {
      doc.fontSize(16).text(section.name, { underline: true });
      doc.moveDown(0.5);
      section.rows.forEach(r => {
        const date = r.trans_date ? formatDateShort(new Date(r.trans_date)) : '-';
        doc.fontSize(10).text(`${date} | ${r.category} | ${r.description || ''} | Rp ${formatNumber(r.amount || 0)}`);
      });
      doc.addPage();
    });

    doc.end();
  });
}

function sumRows(rows) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString('id-ID');
}

function formatDateIndonesian(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 
                  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateShort(date) {
  if (!date || isNaN(date.getTime())) return '-';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
