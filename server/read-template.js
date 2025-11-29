import ExcelJS from 'exceljs';
import path from 'path';

const templatePath = path.resolve(process.cwd(), 'templates', 'export_template.xlsx');

async function readTemplate() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  
  console.log('========================================');
  console.log('TEMPLATE: export_template.xlsx');
  console.log('========================================\n');
  
  console.log(`Total sheets: ${workbook.worksheets.length}\n`);
  
  workbook.worksheets.forEach((sheet, index) => {
    console.log(`\n========== SHEET ${index + 1}: "${sheet.name}" ==========`);
    console.log(`Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}\n`);
    
    // Read all rows
    for (let i = 1; i <= Math.min(sheet.rowCount, 40); i++) {
      const row = sheet.getRow(i);
      const values = [];
      
      for (let j = 1; j <= Math.min(sheet.columnCount, 12); j++) {
        const cell = row.getCell(j);
        let value = cell.value;
        
        // Handle rich text
        if (value && typeof value === 'object' && value.richText) {
          value = value.richText.map(t => t.text).join('');
        }
        
        // Handle dates
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        
        // Handle formulas
        if (value && typeof value === 'object' && value.result !== undefined) {
          value = value.result;
        }
        
        values.push(value !== null && value !== undefined ? String(value).substring(0, 25) : '');
      }
      
      // Only print rows with data
      const hasData = values.some(v => v && v.trim());
      if (hasData) {
        console.log(`Row ${i}: ${values.map((v, idx) => `[${String.fromCharCode(65 + idx)}]${v}`).join(' | ')}`);
      }
    }
  });
}

readTemplate().catch(console.error);

