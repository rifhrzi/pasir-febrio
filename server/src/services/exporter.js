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

  if (templatePath) {
    try {
      await workbook.xlsx.readFile(templatePath);
      const sheet = workbook.getWorksheet('Table 1') || workbook.worksheets[0];
      
      if (sheet) {
        // Update template with actual data
        updateTemplateValues(sheet, {
          totalIncome,
          totalExpense,
          totalLoans,
          sisaPendapatan,
          sisaKas,
          startDate,
          endDate,
          expenses,
          loans
        });
      }
    } catch (err) {
      console.warn('Failed to read template, creating new workbook', err);
      createFreshWorkbook(workbook, { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas });
    }
  } else {
    createFreshWorkbook(workbook, { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas });
  }

  return workbook.xlsx.writeBuffer();
}

function updateTemplateValues(sheet, data) {
  const { totalIncome, totalExpense, totalLoans, sisaPendapatan, sisaKas, startDate, endDate, expenses, loans } = data;

  // Update Row 2 - Date range (if cell exists)
  try {
    const row2 = sheet.getRow(2);
    for (let col = 1; col <= 10; col++) {
      const cell = row2.getCell(col);
      const text = getCellText(cell.value);
      if (text && (text.includes('JULI') || text.includes('AGUSTUS') || text.includes('-'))) {
        cell.value = `${startDate} - ${endDate}`;
        break;
      }
    }
  } catch (e) { console.log('Row 2 update skipped'); }

  // Update Row 3 - PENDAPATAN total
  try {
    const row3 = sheet.getRow(3);
    for (let col = 1; col <= 10; col++) {
      const cell = row3.getCell(col);
      const text = getCellText(cell.value);
      if (text && text.toUpperCase().includes('PENDAPATAN')) {
        cell.value = `PENDAPATAN ${formatRupiahText(totalIncome)}`;
        break;
      }
    }
  } catch (e) { console.log('Row 3 update skipped'); }

  // Update summary values on the right side (columns G-H)
  updateCellByLabel(sheet, 'Pengeluaran', totalExpense, 6, 8);
  updateCellByLabel(sheet, 'Pendapatan', totalIncome, 7, 8);
  updateCellByLabel(sheet, 'Pendapatan', sisaPendapatan, 8, 8); // Second pendapatan = sisa
  
  // Update Sisa Kas value
  updateCellByLabel(sheet, 'Sisa Kas', sisaKas, null, 8);
  
  // Update Jumlah
  updateCellByLabel(sheet, 'Jumlah', totalExpense, null, 8);

  // Update Catatan Hutang section
  updateLoanSection(sheet, loans, totalLoans);
  
  // Update expense items in the table (rows 6-8 area)
  updateExpenseTable(sheet, expenses);
  
  // Update Pengeluaran total in column C (row 17 area)
  updatePengeluaranTotal(sheet, totalExpense);
}

function updateCellByLabel(sheet, label, value, specificRow = null, valueCol = null) {
  sheet.eachRow((row, rowNumber) => {
    if (specificRow && rowNumber !== specificRow) return;
    
    row.eachCell((cell, colNumber) => {
      const text = getCellText(cell.value);
      if (text && text.toLowerCase().includes(label.toLowerCase())) {
        // Find the value cell (usually in next column or specific column)
        const targetCol = valueCol || colNumber + 1;
        const valueCell = sheet.getCell(rowNumber, targetCol);
        
        if (typeof value === 'number') {
          // Check if it should be formatted as currency text or number
          const currentValueText = getCellText(valueCell.value);
          if (currentValueText && currentValueText.includes('Rp')) {
            valueCell.value = formatRupiahText(value);
          } else {
            valueCell.value = formatNumber(value);
          }
        } else {
          valueCell.value = value;
        }
      }
    });
  });
}

function updateLoanSection(sheet, loans, totalLoans) {
  // Find "Catatan Hutang" row
  let loanStartRow = null;
  let totalHutangRow = null;
  
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      const text = getCellText(cell.value);
      if (text && text.toLowerCase().includes('catatan hutang') && text.toLowerCase().includes('belum dibayar')) {
        loanStartRow = rowNumber;
      }
      if (text && text.toLowerCase() === 'total hutang') {
        totalHutangRow = rowNumber;
      }
    });
  });

  if (loanStartRow) {
    // Update loan items starting from row after header
    const loanData = loans.length > 0 ? loans : [{ category: 'Tidak ada hutang', amount: 0 }];
    
    loanData.forEach((loan, idx) => {
      const row = sheet.getRow(loanStartRow + 1 + idx);
      row.getCell(2).value = `${idx + 1}. ${loan.category || 'Hutang'}${loan.description ? ' - ' + loan.description : ''}`;
      row.getCell(3).value = `Rp ${formatNumber(loan.amount || 0)}`;
    });
  }
  
  // Update Total Hutang
  if (totalHutangRow) {
    // Total Hutang is typically in the same row
  }
}

function updateExpenseTable(sheet, expenses) {
  // Find the row with "NO" header (typically row 4)
  let headerRow = null;
  
  sheet.eachRow((row, rowNumber) => {
    const cellA = row.getCell(1);
    const text = getCellText(cellA.value);
    if (text && text.toUpperCase() === 'NO') {
      headerRow = rowNumber;
    }
  });

  if (!headerRow) return;
  
  // Data starts 2 rows after header (after sub-header)
  const dataStartRow = headerRow + 2;
  
  // Update expense rows (up to 3 rows in the template)
  expenses.slice(0, 3).forEach((expense, idx) => {
    const row = sheet.getRow(dataStartRow + idx);
    row.getCell(1).value = idx + 1; // NO
    row.getCell(2).value = `${expense.category || ''}${expense.description ? ' - ' + expense.description : ''}`; // KOMPONEN
    row.getCell(8).value = formatNumber(expense.amount || 0); // JUMLAH (RP) - column H
  });
}

function updatePengeluaranTotal(sheet, totalExpense) {
  sheet.eachRow((row, rowNumber) => {
    const cellB = row.getCell(2);
    const text = getCellText(cellB.value);
    if (text && text.toLowerCase() === 'pengeluaran') {
      // Update column C with total
      row.getCell(3).value = formatNumber(totalExpense);
    }
  });
}

function createFreshWorkbook(workbook, data) {
  const { incomes, expenses, loans, totalIncome, totalExpense, totalLoans, sisaKas } = data;
  
  const sheet = workbook.addWorksheet('Laporan Keuangan');
  
  // Set column widths
  sheet.columns = [
    { width: 5 },  // A - NO
    { width: 40 }, // B - Description
    { width: 15 }, // C - Amount
    { width: 15 }, // D
    { width: 15 }, // E
    { width: 15 }, // F
    { width: 15 }, // G - Label
    { width: 18 }, // H - Value
  ];

  // Header
  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = 'BIAYA OPERASIONAL DAN PRODUKSI';
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  // Date range
  const allDates = [...incomes, ...expenses, ...loans].map(r => r.trans_date).filter(d => d).sort();
  const startDate = allDates.length > 0 ? formatDateIndonesian(allDates[0]) : '-';
  const endDate = allDates.length > 0 ? formatDateIndonesian(allDates[allDates.length - 1]) : '-';
  
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `${startDate} - ${endDate}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // Total Income
  sheet.mergeCells('A3:H3');
  sheet.getCell('A3').value = `PENDAPATAN ${formatRupiahText(totalIncome)}`;
  sheet.getCell('A3').font = { bold: true };
  sheet.getCell('A3').alignment = { horizontal: 'center' };

  // Empty row
  let currentRow = 5;

  // Expense Header
  sheet.getCell(`A${currentRow}`).value = 'NO';
  sheet.getCell(`B${currentRow}`).value = 'KOMPONEN BIAYA OPERASIONAL DAN PRODUKSI';
  sheet.getCell(`C${currentRow}`).value = 'JUMLAH (RP)';
  sheet.getCell(`G${currentRow}`).value = 'KETERANGAN';
  sheet.getCell(`H${currentRow}`).value = 'NILAI';
  
  const headerRowObj = sheet.getRow(currentRow);
  headerRowObj.font = { bold: true };
  headerRowObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
  currentRow++;

  // Expenses
  expenses.forEach((expense, idx) => {
    sheet.getCell(`A${currentRow}`).value = idx + 1;
    sheet.getCell(`B${currentRow}`).value = `${expense.category || ''}${expense.description ? ' - ' + expense.description : ''}`;
    sheet.getCell(`C${currentRow}`).value = formatNumber(expense.amount || 0);
    currentRow++;
  });

  // Summary on right side
  const summaryStartRow = 6;
  sheet.getCell(`G${summaryStartRow}`).value = 'Pengeluaran';
  sheet.getCell(`H${summaryStartRow}`).value = formatNumber(totalExpense);
  sheet.getCell(`G${summaryStartRow + 1}`).value = 'Pendapatan';
  sheet.getCell(`H${summaryStartRow + 1}`).value = formatNumber(totalIncome);
  sheet.getCell(`G${summaryStartRow + 2}`).value = 'Sisa Pendapatan';
  sheet.getCell(`H${summaryStartRow + 2}`).value = formatNumber(totalIncome - totalExpense);

  currentRow = Math.max(currentRow, summaryStartRow + 4);

  // Loan Section
  sheet.getCell(`B${currentRow}`).value = 'Catatan Hutang 1 (Yang belum dibayar):';
  sheet.getCell(`B${currentRow}`).font = { bold: true };
  sheet.getCell(`B${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  currentRow++;

  if (loans.length === 0) {
    sheet.getCell(`B${currentRow}`).value = '1. Tidak ada hutang';
    sheet.getCell(`C${currentRow}`).value = 'Rp 0';
    currentRow++;
  } else {
    loans.forEach((loan, idx) => {
      sheet.getCell(`B${currentRow}`).value = `${idx + 1}. ${loan.category || 'Hutang'}${loan.description ? ' - ' + loan.description : ''}`;
      sheet.getCell(`C${currentRow}`).value = formatRupiahText(loan.amount || 0);
      currentRow++;
    });
  }

  sheet.getCell(`B${currentRow}`).value = 'Total Hutang';
  sheet.getCell(`B${currentRow}`).font = { bold: true };
  sheet.getCell(`B${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`C${currentRow}`).value = formatRupiahText(totalLoans);
  currentRow += 2;

  // Sisa Kas
  sheet.getCell(`G${currentRow}`).value = 'Sisa Kas';
  sheet.getCell(`H${currentRow}`).value = formatNumber(sisaKas);
  sheet.getCell(`G${currentRow}`).font = { bold: true };
  sheet.getCell(`H${currentRow}`).font = { bold: true };

  // Apply borders to data area
  for (let r = 5; r <= currentRow; r++) {
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
        doc.fontSize(10).text(`${r.trans_date} | ${r.category} | ${r.description || ''} | ${r.amount}`);
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
