import ExcelJS from 'exceljs';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'PP CIOMAS 14 OKT - 18 NOV.xlsx');

async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  console.log('========================================');
  console.log('EXCEL FILE: PP CIOMAS 14 OKT - 18 NOV.xlsx');
  console.log('========================================\n');
  
  console.log(`Total sheets: ${workbook.worksheets.length}\n`);
  
  workbook.worksheets.forEach((sheet, index) => {
    console.log(`\n========== SHEET ${index + 1}: "${sheet.name}" ==========`);
    console.log(`Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}\n`);
    
    // Read first 30 rows to understand structure
    const maxRows = Math.min(sheet.rowCount, 50);
    
    for (let i = 1; i <= maxRows; i++) {
      const row = sheet.getRow(i);
      const values = [];
      
      for (let j = 1; j <= Math.min(sheet.columnCount, 15); j++) {
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
        
        values.push(value !== null && value !== undefined ? String(value).substring(0, 20) : '');
      }
      
      // Only print rows with data
      const hasData = values.some(v => v && v.trim());
      if (hasData) {
        console.log(`Row ${i}: ${values.join(' | ')}`);
      }
    }
  });
}

readExcel().catch(console.error);

