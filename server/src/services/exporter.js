import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../db.js';

const DEFAULT_TEMPLATE_PATH = path.resolve(process.cwd(), 'server', 'templates', 'export_template.xlsx');

export async function exportData({ type = 'all', format = 'xlsx', templatePath }) {
  const sections = [];
  if (type === 'incomes' || type === 'all') {
    const { rows } = await query('SELECT * FROM incomes ORDER BY trans_date');
    sections.push({ name: 'Incomes', rows });
  }
  if (type === 'expenses' || type === 'all') {
    const { rows } = await query('SELECT * FROM expenses ORDER BY trans_date');
    sections.push({ name: 'Expenses', rows });
  }
  if (type === 'loans' || type === 'all') {
    const { rows } = await query('SELECT * FROM loans ORDER BY trans_date');
    sections.push({ name: 'Loans', rows });
  }

  let resolvedTemplate = templatePath || process.env.EXPORT_TEMPLATE_PATH || DEFAULT_TEMPLATE_PATH;
  if (resolvedTemplate && !fs.existsSync(resolvedTemplate)) {
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
  if (templatePath) {
    try {
      await workbook.xlsx.readFile(templatePath);
    } catch (err) {
      console.warn('Failed to read template, fallback to blank workbook', err);
    }
  }

  const sheet = workbook.getWorksheet('Table 1') || workbook.worksheets[0];
  if (sheet) {
    applyTemplate({
      sheet,
      incomes: findSection(sections, 'Incomes'),
      expenses: findSection(sections, 'Expenses'),
      loans: findSection(sections, 'Loans')
    });
  } else {
    sections.forEach(section => {
      const ws = workbook.addWorksheet(section.name);
      ws.addRow(Object.keys(section.rows[0] || {}));
      section.rows.forEach(row => ws.addRow(Object.values(row)));
    });
  }

  return workbook.xlsx.writeBuffer();
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

const headerAliasMap = {
  date: 'trans_date',
  tanggal: 'trans_date',
  transdate: 'trans_date',
  category: 'category',
  kategori: 'category',
  description: 'description',
  deskripsi: 'description',
  notes: 'description',
  amount: 'amount',
  nominal: 'amount',
  value: 'amount',
  id: 'id',
  createdat: 'created_at'
};

function normalizeHeader(header) {
  if (!header) return null;
  return header.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapHeaderToKey(header) {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;
  return headerAliasMap[normalized] || normalized;
}

function applyTemplate({ sheet, incomes, expenses, loans }) {
  populateExpenseTable(sheet, expenses);
  populateSummaries(sheet, {
    incomes,
    expenses,
    loans
  });
  populateLoanNotes(sheet, loans);
}

function populateExpenseTable(sheet, rows = []) {
  const headerRow = findRowIndex(sheet, value => value && value.toString().trim().toUpperCase() === 'NO');
  if (!headerRow) return;
  const dataStart = headerRow + 2; // skip header + sub-header
  const footerRow = findRowIndex(sheet, value => includesText(value, 'pengeluaran'), dataStart) || dataStart;
  const rowsToRemove = Math.max(footerRow - dataStart, 0);
  if (rowsToRemove) {
    sheet.spliceRows(dataStart, rowsToRemove);
  }

  const payload = (rows.length ? rows : [{ category: 'Tidak ada data', amount: 0 }]).map((entry, idx) => [
    idx + 1,
    formatExpenseLabel(entry),
    null,
    null,
    null,
    null,
    null,
    Number(entry.amount || 0)
  ]);

  if (payload.length) {
    sheet.spliceRows(dataStart, 0, ...payload);
  }
}

function populateSummaries(sheet, { incomes = [], expenses = [], loans = [] }) {
  const totalIncome = sumRows(incomes);
  const totalExpense = sumRows(expenses);
  const totalLoans = sumRows(loans);
  const sisaPendapatan = totalIncome - totalExpense;
  const sisaKas = sisaPendapatan - totalLoans;

  updateLabelAndValue(sheet, 'Pendapatan', totalIncome);
  updateLabelAndValue(sheet, 'Pengeluaran', totalExpense);
  updateLabelAndValue(sheet, 'Sisa Pendapatan', sisaPendapatan);
  updateLabelAndValue(sheet, 'Sisa Kas', sisaKas);
}

function populateLoanNotes(sheet, loans = []) {
  const startRow = findRowIndex(sheet, value => includesText(value, 'catatan hutang'));
  if (!startRow) return;
  const nextSection = findRowIndex(sheet, value => includesText(value, 'catatan pembahasan') || includesText(value, 'catatan beban'), startRow + 1);
  const removeCount = nextSection ? Math.max(nextSection - (startRow + 1), 0) : 0;
  if (removeCount) {
    sheet.spliceRows(startRow + 1, removeCount);
  }

  const payload = (loans.length ? loans : [{ category: 'Tidak ada hutang', amount: 0 }]).map((entry, idx) => [
    null,
    formatLoanLabel(entry, idx),
    formatRupiahText(entry.amount || 0),
    null,
    null,
    null,
    null,
    null
  ]);

  if (payload.length) {
    sheet.spliceRows(startRow + 1, 0, ...payload);
  }
}

function updateLabelAndValue(sheet, label, amount) {
  const cells = findCells(sheet, value => includesText(value, label));
  const formatted = formatRupiahText(amount);
  cells.forEach(({ row, col }) => {
    const cell = sheet.getCell(row, col);
    if (col === 1) {
      cell.value = `${label.toUpperCase()} ${formatted}`;
    } else {
      cell.value = label;
      const valueCell = sheet.getCell(row, col + 1);
      valueCell.value = Number(amount || 0);
    }
  });
}

function findRowIndex(sheet, predicate, startRow = 1) {
  for (let i = startRow; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (!row) continue;
    for (let j = 1; j <= row.cellCount; j++) {
      const value = row.getCell(j).value;
      if (predicate(value, i, j)) {
        return i;
      }
    }
  }
  return null;
}

function findCells(sheet, predicate) {
  const cells = [];
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (predicate(cell.value, rowNumber, colNumber)) {
        cells.push({ row: rowNumber, col: colNumber });
      }
    });
  });
  return cells;
}

function includesText(value, keyword) {
  if (!value || !keyword) return false;
  return value.toString().toLowerCase().includes(keyword.toLowerCase());
}

function sumRows(rows) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function formatRupiahText(value) {
  const numeric = Number(value || 0);
  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  return formatter.format(numeric);
}

function formatExpenseLabel(entry) {
  const base = entry.category || 'Tidak ada kategori';
  if (entry.description) {
    return `${base} - ${entry.description}`;
  }
  if (entry.trans_date) {
    return `${base} (${entry.trans_date})`;
  }
  return base;
}

function formatLoanLabel(entry, idx) {
  const base = entry.category || 'Hutang';
  const desc = entry.description ? ` - ${entry.description}` : '';
  return `${idx + 1}. ${base}${desc}`;
}
