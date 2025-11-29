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

  // Group expenses by category for summary
  const expenseByCategory = {};
  expenses.forEach(exp => {
    const cat = (exp.category || 'LAINNYA').toUpperCase();
    if (!expenseByCategory[cat]) {
      expenseByCategory[cat] = { items: [], total: 0 };
    }
    expenseByCategory[cat].items.push(exp);
    expenseByCategory[cat].total += Number(exp.amount || 0);
  });

  // Group incomes by category
  const incomeByCategory = {};
  incomes.forEach(inc => {
    const cat = (inc.category || 'LAINNYA').toUpperCase();
    if (!incomeByCategory[cat]) {
      incomeByCategory[cat] = { items: [], total: 0 };
    }
    incomeByCategory[cat].items.push(inc);
    incomeByCategory[cat].total += Number(inc.amount || 0);
  });

  if (templatePath) {
    try {
      await workbook.xlsx.readFile(templatePath);
      const sheet = workbook.getWorksheet('Table 1') || workbook.worksheets[0];
      
      if (sheet) {
        // Update template with actual data based on exact template structure
        populateTemplate(sheet, {
          totalIncome,
          totalExpense,
          totalLoans,
          sisaPendapatan,
          sisaKas,
          startDate,
          endDate,
          expenses,
          loans,
          expenseByCategory,
          incomeByCategory
        });
      }
    } catch (err) {
      console.warn('Failed to read template, creating new workbook', err);
      createFreshWorkbook(workbook, { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas, expenseByCategory });
    }
  } else {
    createFreshWorkbook(workbook, { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas, expenseByCategory });
  }

  return workbook.xlsx.writeBuffer();
}

/**
 * Populate the template based on exact structure from server/templates/export_template.xlsx
 * Template Structure:
 * Row 1: BIAYA OPERASIONAL DAN PRODUKSI (merged)
 * Row 2: Date range (merged)
 * Row 3: PENDAPATAN Rp xxx (merged)
 * Row 4-5: Headers (NO, KOMPONEN BIAYA, SATUAN DT/TRON/PICKUP, VOL, SATUAN RP, JUMLAH RP)
 * Row 6-15: Expense data rows (10 rows)
 * Row 18: Pengeluaran (G) - Value (H)
 * Row 19: Pendapatan (G) - Value (H)
 * Row 20: Sisa Pendapatan (G) - Value (H)
 * Row 21: Catatan Hutang header (B)
 * Row 22-24: Hutang items (B-C)
 * Row 25: Total Hutang (B-C)
 * Row 27: Catatan Pembahasan 2 header
 * Row 28: Sisa Kas label/value (E-F)
 */
function populateTemplate(sheet, data) {
  const { totalIncome, totalExpense, totalLoans, sisaPendapatan, sisaKas, startDate, endDate, expenses, loans, expenseByCategory } = data;

  // Row 2: Update date range
  const row2 = sheet.getRow(2);
  row2.getCell(1).value = `${startDate} - ${endDate}`;

  // Row 3: Update PENDAPATAN total
  const row3 = sheet.getRow(3);
  row3.getCell(1).value = `PENDAPATAN ${formatRupiahText(totalIncome)}`;

  // Rows 6-15: Fill expense data (grouped by category)
  const categoryNames = Object.keys(expenseByCategory).sort((a, b) => expenseByCategory[b].total - expenseByCategory[a].total);
  let expenseRowIdx = 0;
  
  for (let i = 6; i <= 15; i++) {
    const row = sheet.getRow(i);
    if (expenseRowIdx < categoryNames.length) {
      const catName = categoryNames[expenseRowIdx];
      const catData = expenseByCategory[catName];
      row.getCell(1).value = expenseRowIdx + 1; // NO
      row.getCell(2).value = catName; // KOMPONEN BIAYA
      row.getCell(8).value = formatNumber(catData.total); // JUMLAH (RP) - column H
      expenseRowIdx++;
    } else {
      // Clear remaining rows
      row.getCell(1).value = '';
      row.getCell(2).value = '';
      row.getCell(8).value = '';
    }
  }

  // Row 18: Pengeluaran value (column H)
  sheet.getRow(18).getCell(8).value = formatNumber(totalExpense);

  // Row 19: Pendapatan value (column H)
  sheet.getRow(19).getCell(8).value = formatNumber(totalIncome);

  // Row 20: Sisa Pendapatan value (column H)
  sheet.getRow(20).getCell(8).value = formatNumber(sisaPendapatan);

  // Row 21-24: Catatan Hutang items
  const loanItems = loans.length > 0 ? loans.slice(0, 3) : [{ category: 'Tidak ada hutang', amount: 0 }];
  loanItems.forEach((loan, idx) => {
    const row = sheet.getRow(22 + idx);
    row.getCell(2).value = `${idx + 1}. ${loan.category || 'Hutang'}${loan.description ? ' - ' + loan.description.substring(0, 30) : ''}`;
    row.getCell(3).value = formatRupiahText(loan.amount || 0);
  });

  // Clear remaining loan rows if less than 3
  for (let i = loanItems.length; i < 3; i++) {
    const row = sheet.getRow(22 + i);
    row.getCell(2).value = '';
    row.getCell(3).value = '';
  }

  // Row 25: Total Hutang
  sheet.getRow(25).getCell(3).value = formatRupiahText(totalLoans);

  // Row 28: Sisa Kas value (column F)
  sheet.getRow(28).getCell(6).value = formatNumber(sisaKas);

  // Also update Sisa Kas in any other location if exists
  updateCellIfLabel(sheet, 'Sisa Kas', sisaKas);
}

function updateCellIfLabel(sheet, label, value) {
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const text = getCellText(cell.value);
      if (text && text.toLowerCase().includes(label.toLowerCase()) && !text.includes('Rp')) {
        // Update next column with value
        const valueCell = row.getCell(colNumber + 1);
        if (!valueCell.value || getCellText(valueCell.value) === '') {
          valueCell.value = formatNumber(value);
        }
      }
    });
  });
}

function createFreshWorkbook(workbook, data) {
  const { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas, expenseByCategory } = data;
  
  const sheet = workbook.addWorksheet('Laporan Keuangan');
  
  // Set column widths
  sheet.columns = [
    { width: 5 },  // A - NO
    { width: 45 }, // B - Description
    { width: 15 }, // C - DT
    { width: 12 }, // D - TRON
    { width: 12 }, // E - PICK UP
    { width: 8 },  // F - VOL
    { width: 15 }, // G - SATUAN (RP)
    { width: 18 }, // H - JUMLAH (RP)
  ];

  // Get date range
  const allDates = [...incomes, ...expenses, ...loans].map(r => r.trans_date).filter(d => d).sort();
  const startDate = allDates.length > 0 ? formatDateIndonesian(allDates[0]) : '-';
  const endDate = allDates.length > 0 ? formatDateIndonesian(allDates[allDates.length - 1]) : '-';

  // Row 1: Title
  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = 'BIAYA OPERASIONAL DAN PRODUKSI CIMANGGU';
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };

  // Row 2: Date range
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `${startDate} - ${endDate}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  sheet.getCell('A2').font = { bold: true };

  // Row 3: Total Income
  sheet.mergeCells('A3:H3');
  sheet.getCell('A3').value = `PENDAPATAN ${formatRupiahText(totalIncome)}`;
  sheet.getCell('A3').font = { bold: true, size: 12 };
  sheet.getCell('A3').alignment = { horizontal: 'center' };
  sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };

  // Row 4-5: Headers
  const headers = ['NO', 'KOMPONEN BIAYA OPERASIONAL DAN PRODUKSI', 'SATUAN', '', '', 'VOL', 'SATUAN (RP)', 'JUMLAH (RP)'];
  const subHeaders = ['', '', 'DT', 'TRON', 'PICK UP', '', '', ''];
  
  headers.forEach((h, idx) => {
    sheet.getCell(4, idx + 1).value = h;
    sheet.getCell(4, idx + 1).font = { bold: true };
    sheet.getCell(4, idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
  });
  
  subHeaders.forEach((h, idx) => {
    if (h) {
      sheet.getCell(5, idx + 1).value = h;
      sheet.getCell(5, idx + 1).font = { bold: true };
      sheet.getCell(5, idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
    }
  });

  // Rows 6+: Expense categories
  let currentRow = 6;
  const categoryNames = Object.keys(expenseByCategory || {}).sort((a, b) => (expenseByCategory[b]?.total || 0) - (expenseByCategory[a]?.total || 0));
  
  categoryNames.forEach((catName, idx) => {
    const catData = expenseByCategory[catName];
    sheet.getCell(currentRow, 1).value = idx + 1;
    sheet.getCell(currentRow, 2).value = catName;
    sheet.getCell(currentRow, 8).value = formatNumber(catData.total);
    currentRow++;
  });

  // Add empty rows if less than 10
  while (currentRow < 16) {
    sheet.getCell(currentRow, 1).value = currentRow - 5;
    currentRow++;
  }

  // Skip to row 18 for summary
  currentRow = 18;

  // Summary section (columns G-H)
  sheet.getCell(currentRow, 7).value = 'Pengeluaran';
  sheet.getCell(currentRow, 8).value = formatNumber(totalExpense);
  sheet.getRow(currentRow).getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
  currentRow++;

  sheet.getCell(currentRow, 7).value = 'Pendapatan';
  sheet.getCell(currentRow, 8).value = formatNumber(totalIncome);
  sheet.getRow(currentRow).getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
  currentRow++;

  sheet.getCell(currentRow, 7).value = 'Sisa Pendapatan';
  sheet.getCell(currentRow, 8).value = formatNumber(totalIncome - totalExpense);
  sheet.getRow(currentRow).getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };
  currentRow++;

  // Catatan Hutang section
  sheet.getCell(currentRow, 2).value = 'Catatan Hutang 1 (Yang belum dibayar):';
  sheet.getCell(currentRow, 2).font = { bold: true };
  sheet.getCell(currentRow, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  currentRow++;

  if (loans.length === 0) {
    sheet.getCell(currentRow, 2).value = '1. Tidak ada hutang';
    sheet.getCell(currentRow, 3).value = 'Rp 0';
    currentRow++;
  } else {
    loans.forEach((loan, idx) => {
      sheet.getCell(currentRow, 2).value = `${idx + 1}. ${loan.category || 'Hutang'}${loan.description ? ' - ' + loan.description.substring(0, 40) : ''}`;
      sheet.getCell(currentRow, 3).value = formatRupiahText(loan.amount || 0);
      currentRow++;
    });
  }

  sheet.getCell(currentRow, 2).value = 'Total Hutang';
  sheet.getCell(currentRow, 2).font = { bold: true };
  sheet.getCell(currentRow, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(currentRow, 3).value = formatRupiahText(totalLoans);
  currentRow += 2;

  // Sisa Kas
  sheet.getCell(currentRow, 7).value = 'Sisa Kas';
  sheet.getCell(currentRow, 8).value = formatNumber(sisaKas);
  sheet.getRow(currentRow).getCell(7).font = { bold: true };
  sheet.getRow(currentRow).getCell(8).font = { bold: true };
  if (sisaKas < 0) {
    sheet.getRow(currentRow).getCell(8).font = { bold: true, color: { argb: 'FFFF0000' } };
  }

  // Apply borders
  for (let r = 4; r <= currentRow; r++) {
    for (let c = 1; c <= 8; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
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
        doc.fontSize(10).text(`${r.trans_date} | ${r.category} | ${r.description || ''} | Rp ${Number(r.amount || 0).toLocaleString('id-ID')}`);
      });
      doc.addPage();
    });

    doc.end();
  });
}

function getCellText(cellValue) {
  if (!cellValue) return '';
  if (typeof cellValue === 'string') return cellValue;
  if (typeof cellValue === 'number') return cellValue.toString();
  if (cellValue.richText) {
    return cellValue.richText.map(t => t.text).join('');
  }
  if (cellValue.text) return cellValue.text;
  return cellValue.toString();
}

function sumRows(rows) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function formatRupiahText(value) {
  const numeric = Number(value || 0);
  return `Rp ${formatNumber(numeric)}`;
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
