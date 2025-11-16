import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../db.js';

const DEFAULT_TEMPLATE_PATH = path.resolve(process.cwd(), 'server', 'templates', 'export_template.xlsx');

export async function exportData({ type = 'all', format = 'xlsx', templatePath }) {
  // Fetch data
  let data = [];
  if (type === 'incomes' || type === 'all') {
    const { rows } = await query('SELECT * FROM incomes ORDER BY trans_date');
    data.push({ name: 'Incomes', rows });
  }
  if (type === 'expenses' || type === 'all') {
    const { rows } = await query('SELECT * FROM expenses ORDER BY trans_date');
    data.push({ name: 'Expenses', rows });
  }
  if (type === 'loans' || type === 'all') {
    const { rows } = await query('SELECT * FROM loans ORDER BY trans_date');
    data.push({ name: 'Loans', rows });
  }

  let resolvedTemplate = templatePath || process.env.EXPORT_TEMPLATE_PATH || DEFAULT_TEMPLATE_PATH;
  if (resolvedTemplate && !fs.existsSync(resolvedTemplate)) {
    resolvedTemplate = undefined;
  }

  if (format === 'xlsx') {
    return await buildXlsx(data, resolvedTemplate);
  } else if (format === 'pdf') {
    return await buildPdf(data);
  }
  throw new Error('Unsupported format');
}

async function buildXlsx(data, templatePath) {
  const workbook = new ExcelJS.Workbook();
  if (templatePath) {
    await workbook.xlsx.readFile(templatePath);
  }

  data.forEach(section => {
    let sheet = workbook.getWorksheet(section.name);
    if (!sheet) sheet = workbook.addWorksheet(section.name);

    if (!sheet.actualRowCount) {
      const headers = Object.keys(section.rows[0] || {});
      if (headers.length) sheet.addRow(headers);
    }

    const headerRowIndex = findHeaderRow(sheet);
    const headerRow = sheet.getRow(headerRowIndex);
    const headerCells = headerRow.values.slice(1);
    const headerKeys = headerCells.map(mapHeaderToKey);
    const dataStartRow = headerRow.number + 1;
    const existingDataRows = Math.max(sheet.actualRowCount - headerRow.number, 0);
    if (existingDataRows) {
      sheet.spliceRows(dataStartRow, existingDataRows);
    }

    section.rows.forEach(row => {
      const newRow = headerKeys.map(key => (key ? row[key] ?? '' : ''));
      sheet.insertRow(dataStartRow, newRow, 'i');
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
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

function findHeaderRow(sheet) {
  for (let i = 1; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (!row) continue;
    const hasValue = row.values.some(value => value !== null && value !== undefined && value !== '');
    if (hasValue) return i;
  }
  return 1;
}
