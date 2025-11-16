import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../db.js';

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

  if (format === 'xlsx') {
    return await buildXlsx(data, templatePath);
  } else if (format === 'pdf') {
    return await buildPdf(data);
  }
  throw new Error('Unsupported format');
}

async function buildXlsx(data, templatePath) {
  const workbook = new ExcelJS.Workbook();
  if (templatePath && fs.existsSync(templatePath)) {
    await workbook.xlsx.readFile(templatePath);
  }

  data.forEach(section => {
    let sheet = workbook.getWorksheet(section.name);
    if (!sheet) sheet = workbook.addWorksheet(section.name);
    // Header if empty
    if (sheet.rowCount === 0) {
      sheet.addRow(Object.keys(section.rows[0] || {}));
    }
    section.rows.forEach(r => {
      sheet.addRow(Object.values(r));
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
