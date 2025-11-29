import ExcelJS from 'exceljs';
import path from 'path';

const templatePath = path.resolve(process.cwd(), 'templates', 'export_template.xlsx');

async function readTemplate() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  
  console.log('========================================');
  console.log('DETAIL TEMPLATE STRUCTURE');
  console.log('========================================\n');
  
  const sheet = workbook.getWorksheet('Table 1') || workbook.worksheets[0];
  
  console.log(`Sheet: "${sheet.name}"`);
  console.log(`Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}\n`);
  
  // Check merged cells
  console.log('=== MERGED CELLS ===');
  if (sheet._merges) {
    Object.keys(sheet._merges).forEach(key => {
      console.log(`Merged: ${key}`);
    });
  }
  console.log('');
  
  // Read every cell with exact position
  console.log('=== CELL BY CELL ===\n');
  
  for (let rowNum = 1; rowNum <= Math.min(sheet.rowCount, 45); rowNum++) {
    const row = sheet.getRow(rowNum);
    let rowHasData = false;
    const cellData = [];
    
    for (let colNum = 1; colNum <= 11; colNum++) {
      const cell = row.getCell(colNum);
      let value = cell.value;
      
      // Get the actual value
      if (value && typeof value === 'object') {
        if (value.richText) {
          value = value.richText.map(t => t.text).join('');
        } else if (value.result !== undefined) {
          value = value.result;
        } else if (value.formula) {
          value = `[FORMULA: ${value.formula}]`;
        }
      }
      
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      
      const colLetter = String.fromCharCode(64 + colNum);
      
      if (value !== null && value !== undefined && value !== '') {
        rowHasData = true;
        const displayValue = String(value).substring(0, 35);
        cellData.push(`${colLetter}${rowNum}="${displayValue}"`);
      }
    }
    
    if (rowHasData) {
      console.log(`Row ${rowNum}:`);
      cellData.forEach(cd => console.log(`  ${cd}`));
      console.log('');
    }
  }
}

readTemplate().catch(console.error);

