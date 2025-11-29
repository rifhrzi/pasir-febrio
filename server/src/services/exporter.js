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

  let resolvedTemplate = templatePath || process.env.EXPORT_TEMPLATE_PATH || DEFAULT_TEMPLATE_PATH;
  if (resolvedTemplate && !fs.existsSync(resolvedTemplate)) {
    console.warn('Template not found:', resolvedTemplate);
    resolvedTemplate = undefined;
  }

  if (format === 'xlsx') {
    return await buildXlsx(sections, resolvedTemplate);
  }
  if (format === 'pdf') {
    return await buildPdf(sections);
  }
  throw new Error('Unsupported format');
}

async function buildXlsx(sections, templatePath) {
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

  // Group expenses by category
  const expenseByCategory = {};
  expenses.forEach(exp => {
    const cat = (exp.category || 'LAINNYA').toUpperCase();
    if (!expenseByCategory[cat]) {
      expenseByCategory[cat] = { items: [], total: 0 };
    }
    expenseByCategory[cat].items.push(exp);
    expenseByCategory[cat].total += Number(exp.amount || 0);
  });

  if (templatePath) {
    try {
      await workbook.xlsx.readFile(templatePath);
      const sheet = workbook.getWorksheet('Table 1') || workbook.worksheets[0];
      
      if (sheet) {
        populateTemplateExact(sheet, {
          totalIncome,
          totalExpense,
          totalLoans,
          sisaPendapatan,
          sisaKas,
          startDate,
          endDate,
          expenses,
          loans,
          expenseByCategory
        });
      }
    } catch (err) {
      console.warn('Failed to read template:', err.message);
      createFreshWorkbook(workbook, { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas, expenseByCategory });
    }
  } else {
    createFreshWorkbook(workbook, { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas, expenseByCategory });
  }

  return workbook.xlsx.writeBuffer();
}

/**
 * Populate template EXACTLY matching server/templates/export_template.xlsx
 * 
 * TEMPLATE STRUCTURE:
 * Row 1: A1:H1 merged - "BIAYA OPERASIONAL DAN PRODUKSI CIMANGGU (IV)"
 * Row 2: A2:H2 merged - "13 JULI - 12 AGUSTUS 2024" (date range)
 * Row 3: A3:H3 merged - "PENDAPATAN Rp. 1.287.755.000,-"
 * Row 4-5: Headers (NO, KOMPONEN BIAYA, SATUAN DT/TRON/PICKUP, VOL, SATUAN RP, JUMLAH RP)
 * Row 6-15: Data rows (A=NO 1-10, B=KOMPONEN, H=JUMLAH)
 * Row 18: G18="Pengeluaran" -> H18=value
 * Row 19: G19="Pendapatan" -> H19=value
 * Row 20: G20="Sisa Pendapatan" -> H20=value
 * Row 21: B21="Catatan Hutang 1 (Yang belum dibayar):"
 * Row 22: B22=Hutang item 1, C22=amount | E22:F22="Rekap"
 * Row 23: B23=Hutang item 2, C23=amount | E23:F23="Pendapatan" -> G23/H23=value
 * Row 24: B24=Hutang item 3, C24=amount | E24:F24="Pengeluaran" -> G24/H24=value
 * Row 25: B25="Total Hutang", C25=total | E25:F25="Catatan Pembahasan 2"
 * Row 26: E26:F26="Catatan Beban HO 3"
 * Row 27: B27="Catatan Pembahasan 2:" | E27:F27="Jumlah" -> G27/H27=value
 * Row 28: B28=item | E28:F28="Sisa Kas" -> G28/H28=value
 * Row 30: E30:F30="Catatan Hutang 1"
 * Row 35: B35="Total"
 * Row 37: B37="Catatan Beban HO 3:"
 * Row 40: B40="Total"
 */
function populateTemplateExact(sheet, data) {
  const { totalIncome, totalExpense, totalLoans, sisaPendapatan, sisaKas, startDate, endDate, loans, expenseByCategory } = data;

  // === ROW 2: Date Range (merged A2:H2) ===
  sheet.getCell('A2').value = `${startDate} - ${endDate}`;

  // === ROW 3: PENDAPATAN total (merged A3:H3) ===
  sheet.getCell('A3').value = `PENDAPATAN Rp. ${formatNumber(totalIncome)},-`;

  // === ROWS 6-15: Expense data by category ===
  const categoryNames = Object.keys(expenseByCategory).sort((a, b) => expenseByCategory[b].total - expenseByCategory[a].total);
  
  for (let i = 0; i < 10; i++) {
    const rowNum = 6 + i;
    const row = sheet.getRow(rowNum);
    
    if (i < categoryNames.length) {
      const catName = categoryNames[i];
      const catData = expenseByCategory[catName];
      
      // A = NO (already has 1-10)
      // B = KOMPONEN BIAYA
      row.getCell('B').value = catName;
      // H = JUMLAH (RP)
      row.getCell('H').value = formatNumber(catData.total);
    } else {
      // Clear if no data
      row.getCell('B').value = '';
      row.getCell('H').value = '';
    }
  }

  // === ROW 18: Pengeluaran (G18 label, H18 value) ===
  sheet.getCell('H18').value = formatNumber(totalExpense);

  // === ROW 19: Pendapatan (G19 label, H19 value) ===
  sheet.getCell('H19').value = formatNumber(totalIncome);

  // === ROW 20: Sisa Pendapatan (G20 label, H20 value) ===
  sheet.getCell('H20').value = formatNumber(sisaPendapatan);

  // === ROWS 22-24: Hutang items (B=description, C=amount) ===
  const loanItems = loans.length > 0 ? loans.slice(0, 3) : [];
  
  for (let i = 0; i < 3; i++) {
    const rowNum = 22 + i;
    const row = sheet.getRow(rowNum);
    
    if (i < loanItems.length) {
      const loan = loanItems[i];
      row.getCell('B').value = `${i + 1}. ${loan.category || 'Hutang'}${loan.description ? ' (' + loan.description.substring(0, 25) + ')' : ''}`;
      row.getCell('C').value = `Rp ${formatNumber(loan.amount || 0)}`;
    } else if (i === 0 && loans.length === 0) {
      row.getCell('B').value = '1. Tidak ada hutang';
      row.getCell('C').value = 'Rp 0';
    } else {
      row.getCell('B').value = '';
      row.getCell('C').value = '';
    }
  }

  // === ROW 23: Rekap Pendapatan (right side: G23 or H23) ===
  sheet.getCell('G23').value = formatNumber(totalIncome);

  // === ROW 24: Rekap Pengeluaran (right side: G24 or H24) ===
  sheet.getCell('G24').value = formatNumber(totalExpense);

  // === ROW 25: Total Hutang (B25 label, C25 value) ===
  sheet.getCell('C25').value = `Rp ${formatNumber(totalLoans)}`;

  // === ROW 27: Jumlah (right side: G27 or H27) ===
  sheet.getCell('G27').value = formatNumber(totalExpense);

  // === ROW 28: Sisa Kas (right side: G28 or H28) ===
  sheet.getCell('G28').value = formatNumber(sisaKas);

  // === ROW 35: Total (for Catatan Pembahasan section) ===
  sheet.getCell('C35').value = formatNumber(totalExpense);

  // === ROW 40: Total (for Catatan Beban HO section) ===
  // Keep original or update if needed
}

function createFreshWorkbook(workbook, data) {
  const { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas, expenseByCategory } = data;
  
  const sheet = workbook.addWorksheet('Laporan Keuangan');
  
  // Set column widths matching template
  sheet.columns = [
    { width: 5 },   // A - NO
    { width: 40 },  // B - KOMPONEN BIAYA
    { width: 15 },  // C - SATUAN DT
    { width: 12 },  // D - TRON
    { width: 12 },  // E - PICK UP
    { width: 8 },   // F - VOL
    { width: 15 },  // G - SATUAN (RP)
    { width: 18 },  // H - JUMLAH (RP)
  ];

  // Get date range
  const allDates = [...incomes, ...expenses, ...loans].map(r => r.trans_date).filter(d => d).sort();
  const startDate = allDates.length > 0 ? formatDateIndonesian(allDates[0]) : '-';
  const endDate = allDates.length > 0 ? formatDateIndonesian(allDates[allDates.length - 1]) : '-';

  // Row 1: Title
  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'BIAYA OPERASIONAL DAN PRODUKSI CIMANGGU';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

  // Row 2: Date range
  sheet.mergeCells('A2:H2');
  const dateCell = sheet.getCell('A2');
  dateCell.value = `${startDate} - ${endDate}`;
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  dateCell.font = { bold: true };

  // Row 3: Total Income
  sheet.mergeCells('A3:H3');
  const incomeCell = sheet.getCell('A3');
  incomeCell.value = `PENDAPATAN Rp. ${formatNumber(totalIncome)},-`;
  incomeCell.font = { bold: true, size: 12 };
  incomeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  incomeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };

  // Row 4: Main Headers
  const headers4 = ['NO', 'KOMPONEN BIAYA OPERASIONAL DAN PRODUKSI', 'SATUAN', '', '', 'VOL', 'SATUAN (RP)', 'JUMLAH (RP)'];
  headers4.forEach((h, idx) => {
    const cell = sheet.getCell(4, idx + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Row 5: Sub Headers
  const headers5 = ['', '', 'DT', 'TRON', 'PICK UP', '', '', ''];
  headers5.forEach((h, idx) => {
    const cell = sheet.getCell(5, idx + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Rows 6-15: Expense categories
  const categoryNames = Object.keys(expenseByCategory || {}).sort((a, b) => (expenseByCategory[b]?.total || 0) - (expenseByCategory[a]?.total || 0));
  
  for (let i = 0; i < 10; i++) {
    const rowNum = 6 + i;
    const row = sheet.getRow(rowNum);
    
    row.getCell(1).value = i + 1; // NO
    row.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    
    if (i < categoryNames.length) {
      const catName = categoryNames[i];
      const catData = expenseByCategory[catName];
      row.getCell(2).value = catName;
      row.getCell(8).value = formatNumber(catData.total);
    }
    
    // Add borders
    for (let c = 2; c <= 8; c++) {
      row.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
  }

  // Row 17: Empty
  // Row 18: Pengeluaran
  sheet.getCell('G18').value = 'Pengeluaran';
  sheet.getCell('G18').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
  sheet.getCell('H18').value = formatNumber(totalExpense);

  // Row 19: Pendapatan
  sheet.getCell('G19').value = 'Pendapatan';
  sheet.getCell('G19').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
  sheet.getCell('H19').value = formatNumber(totalIncome);

  // Row 20: Sisa Pendapatan
  sheet.getCell('G20').value = 'Sisa Pendapatan';
  sheet.getCell('G20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };
  sheet.getCell('H20').value = formatNumber(totalIncome - totalExpense);

  // Row 21: Catatan Hutang header
  sheet.getCell('B21').value = 'Catatan Hutang 1 (Yang belum dibayar):';
  sheet.getCell('B21').font = { bold: true };
  sheet.getCell('B21').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Rows 22-24: Hutang items
  if (loans.length === 0) {
    sheet.getCell('B22').value = '1. Tidak ada hutang';
    sheet.getCell('C22').value = 'Rp 0';
  } else {
    loans.slice(0, 3).forEach((loan, idx) => {
      const rowNum = 22 + idx;
      sheet.getCell(`B${rowNum}`).value = `${idx + 1}. ${loan.category || 'Hutang'}${loan.description ? ' (' + loan.description.substring(0, 30) + ')' : ''}`;
      sheet.getCell(`C${rowNum}`).value = `Rp ${formatNumber(loan.amount || 0)}`;
    });
  }

  // Row 25: Total Hutang
  sheet.getCell('B25').value = 'Total Hutang';
  sheet.getCell('B25').font = { bold: true };
  sheet.getCell('B25').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell('C25').value = `Rp ${formatNumber(totalLoans)}`;

  // Right side: Rekap section
  sheet.getCell('E22').value = 'Rekap';
  sheet.getCell('E22').font = { bold: true };
  sheet.getCell('E23').value = 'Pendapatan';
  sheet.getCell('G23').value = formatNumber(totalIncome);
  sheet.getCell('E24').value = 'Pengeluaran';
  sheet.getCell('G24').value = formatNumber(totalExpense);
  sheet.getCell('E27').value = 'Jumlah';
  sheet.getCell('G27').value = formatNumber(totalExpense);
  sheet.getCell('E28').value = 'Sisa Kas';
  sheet.getCell('E28').font = { bold: true };
  sheet.getCell('G28').value = formatNumber(sisaKas);
  if (sisaKas < 0) {
    sheet.getCell('G28').font = { bold: true, color: { argb: 'FFFF0000' } };
  }
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
        doc.fontSize(10).text(`${r.trans_date} | ${r.category} | ${r.description || ''} | Rp ${formatNumber(r.amount || 0)}`);
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
