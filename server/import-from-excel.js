import ExcelJS from 'exceljs';
import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

const filePath = path.resolve(process.cwd(), 'PP CIOMAS 14 OKT - 18 NOV.xlsx');

function getCellValue(cell) {
  let value = cell.value;
  if (value && typeof value === 'object' && value.richText) {
    value = value.richText.map(t => t.text).join('');
  }
  if (value && typeof value === 'object' && value.result !== undefined) {
    value = value.result;
  }
  return value;
}

function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value);
}

async function importData() {
  console.log('Reading Excel file:', filePath);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  // Arrays to store data
  const incomes = [];
  const expenses = [];
  const loans = [];

  // ========== SHEET 1: PENDAPATAN (TRONTON) ==========
  const pendapatanSheet = workbook.getWorksheet('PENDAPATAN');
  if (pendapatanSheet) {
    console.log('\n📥 Reading PENDAPATAN sheet (TRONTON)...');
    
    // TRONTON data starts at row 10, columns B-G
    for (let i = 10; i <= pendapatanSheet.rowCount; i++) {
      const row = pendapatanSheet.getRow(i);
      const no = getCellValue(row.getCell(2)); // Column B - NO
      const tanggal = getCellValue(row.getCell(3)); // Column C - TANGGAL
      const namaBarang = getCellValue(row.getCell(5)); // Column E - NAMA BARANG
      const jumlah = getCellValue(row.getCell(6)); // Column F - JUMLAH
      const harga = getCellValue(row.getCell(7)); // Column G - HARGA
      const totalBayar = getCellValue(row.getCell(8)); // Column H - TOTAL BAYAR
      
      if (no && tanggal && totalBayar && Number(totalBayar) > 0) {
        incomes.push({
          date: formatDate(tanggal),
          category: 'TRONTON',
          description: `${namaBarang || 'Pasir Ayak'} - ${jumlah || 1} unit @ Rp ${Number(harga || 0).toLocaleString('id-ID')}`,
          amount: Number(totalBayar)
        });
      }
    }
    console.log(`  Found ${incomes.filter(i => i.category === 'TRONTON').length} TRONTON records`);
  }

  // ========== SHEET 2: COLTDIESEL ==========
  const coltDieselSheet = workbook.getWorksheet('COLTDIESEL');
  if (coltDieselSheet) {
    console.log('\n📥 Reading COLTDIESEL sheet...');
    
    // COLT DIESEL data starts at row 12
    for (let i = 12; i <= coltDieselSheet.rowCount; i++) {
      const row = coltDieselSheet.getRow(i);
      const no = getCellValue(row.getCell(1)); // Column A - NO
      const tanggal = getCellValue(row.getCell(2)); // Column B - TANGGAL
      const namaBarang = getCellValue(row.getCell(4)); // Column D - NAMA BARANG
      const jumlah = getCellValue(row.getCell(5)); // Column E - JUMLAH
      const harga = getCellValue(row.getCell(6)); // Column F - HARGA
      const totalBayar = getCellValue(row.getCell(7)); // Column G - TOTAL BAYAR
      
      if (no && tanggal && totalBayar && Number(totalBayar) > 0) {
        incomes.push({
          date: formatDate(tanggal),
          category: 'COLT DIESEL',
          description: `${namaBarang || 'PASIR AYAK'} - ${jumlah || 1} unit @ Rp ${Number(harga || 0).toLocaleString('id-ID')}`,
          amount: Number(totalBayar)
        });
      }
    }
    console.log(`  Found ${incomes.filter(i => i.category === 'COLT DIESEL').length} COLT DIESEL records`);
  }

  // ========== SHEET 3: PENGELUARAN (All Expenses) ==========
  const pengeluaranSheet = workbook.getWorksheet('PENGELUARAN');
  if (pengeluaranSheet) {
    console.log('\n📤 Reading PENGELUARAN sheet...');
    
    // Data starts at row 7
    for (let i = 7; i <= pengeluaranSheet.rowCount; i++) {
      const row = pengeluaranSheet.getRow(i);
      const no = getCellValue(row.getCell(2)); // Column B - NO
      const tanggal = getCellValue(row.getCell(3)); // Column C - TANGGAL
      const keterangan = getCellValue(row.getCell(5)); // Column E - KETERANGAN
      const totalBayar = getCellValue(row.getCell(6)); // Column F - TOTAL BAYAR
      const deskripsi = getCellValue(row.getCell(7)); // Column G - DESKRIPSI
      
      if (no && tanggal && totalBayar && Number(totalBayar) > 0) {
        // Determine category based on KETERANGAN
        let category = 'OPERASIONAL';
        const ket = String(keterangan || '').toLowerCase();
        
        if (ket.includes('pinjaman')) {
          category = 'PINJAMAN';
        } else if (ket.includes('uang harian') || ket.includes('gaji')) {
          category = 'UANG HARIAN';
        } else if (ket.includes('makan') || ket.includes('minum') || ket.includes('mamin')) {
          category = 'MAKAN MINUM';
        } else if (ket.includes('bbm') || ket.includes('solar') || ket.includes('bensin')) {
          category = 'BBM';
        } else if (ket.includes('belanja') || ket.includes('pembelian')) {
          category = 'BELANJA';
        } else if (ket.includes('deposit')) {
          category = 'DEPOSIT';
        } else if (ket.includes('bop')) {
          category = 'BOP';
        } else if (ket.includes('spare') || ket.includes('part')) {
          category = 'SPAREPART';
        }
        
        expenses.push({
          date: formatDate(tanggal),
          category: category,
          description: `${keterangan || ''} - ${deskripsi || ''}`.trim().replace(/\s*-\s*$/, ''),
          amount: Number(totalBayar)
        });
      }
    }
    console.log(`  Found ${expenses.length} expense records`);
  }

  // ========== SHEET 7: PINJAMAN (Loans - Outstanding) ==========
  const pinjamanSheet = workbook.getWorksheet('PINJAMAN');
  if (pinjamanSheet) {
    console.log('\n💳 Reading PINJAMAN sheet (for loans summary)...');
    
    // This sheet has summary data, we'll use it for loans tracking
    for (let i = 4; i <= pinjamanSheet.rowCount; i++) {
      const row = pinjamanSheet.getRow(i);
      const label = getCellValue(row.getCell(1)); // Column A - Label
      const jumlah = getCellValue(row.getCell(2)); // Column B - Jumlah
      
      if (label && jumlah && Number(jumlah) > 0 && !String(label).toLowerCase().includes('total')) {
        loans.push({
          date: '2025-10-14', // Default date (start of period)
          category: 'PINJAMAN',
          description: String(label).trim(),
          amount: Number(jumlah)
        });
      }
    }
    console.log(`  Found ${loans.length} loan records`);
  }

  // ========== INSERT TO DATABASE ==========
  console.log('\n🔄 Connecting to database...');
  await pool.query('SELECT NOW()');
  console.log('Connected!\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await pool.query('DELETE FROM incomes');
  await pool.query('DELETE FROM expenses');
  await pool.query('DELETE FROM loans');

  // Insert incomes
  console.log('\n📥 Inserting income data...');
  for (const income of incomes) {
    try {
      await pool.query(
        'INSERT INTO incomes (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
        [income.date, income.category, income.description, income.amount]
      );
    } catch (err) {
      console.error(`  Error inserting income: ${err.message}`);
    }
  }
  console.log(`  ✅ Inserted ${incomes.length} income records`);

  // Insert expenses
  console.log('\n📤 Inserting expense data...');
  for (const expense of expenses) {
    try {
      await pool.query(
        'INSERT INTO expenses (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
        [expense.date, expense.category, expense.description, expense.amount]
      );
    } catch (err) {
      console.error(`  Error inserting expense: ${err.message}`);
    }
  }
  console.log(`  ✅ Inserted ${expenses.length} expense records`);

  // Insert loans
  console.log('\n💳 Inserting loan data...');
  for (const loan of loans) {
    try {
      await pool.query(
        'INSERT INTO loans (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
        [loan.date, loan.category, loan.description, loan.amount]
      );
    } catch (err) {
      console.error(`  Error inserting loan: ${err.message}`);
    }
  }
  console.log(`  ✅ Inserted ${loans.length} loan records`);

  // ========== SHOW SUMMARY ==========
  console.log('\n========================================');
  console.log('📊 IMPORT SUMMARY');
  console.log('========================================\n');

  const incomesResult = await pool.query('SELECT category, COUNT(*) as count, SUM(amount) as total FROM incomes GROUP BY category ORDER BY total DESC');
  const expensesResult = await pool.query('SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
  const loansResult = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM loans');

  console.log('💰 PENDAPATAN (Income):');
  let totalIncome = 0;
  incomesResult.rows.forEach(row => {
    const total = Number(row.total);
    totalIncome += total;
    console.log(`   ${row.category}: ${row.count} records = Rp ${total.toLocaleString('id-ID')}`);
  });
  console.log(`   ─────────────────────────────────────`);
  console.log(`   TOTAL: Rp ${totalIncome.toLocaleString('id-ID')}`);

  console.log('\n💸 PENGELUARAN (Expenses):');
  let totalExpense = 0;
  expensesResult.rows.forEach(row => {
    const total = Number(row.total);
    totalExpense += total;
    console.log(`   ${row.category}: ${row.count} records = Rp ${total.toLocaleString('id-ID')}`);
  });
  console.log(`   ─────────────────────────────────────`);
  console.log(`   TOTAL: Rp ${totalExpense.toLocaleString('id-ID')}`);

  const totalLoans = Number(loansResult.rows[0].total) || 0;
  console.log(`\n💳 PINJAMAN (Loans): ${loansResult.rows[0].count} records = Rp ${totalLoans.toLocaleString('id-ID')}`);

  console.log('\n========================================');
  console.log('📈 FINANCIAL SUMMARY');
  console.log('========================================');
  console.log(`   Total Pendapatan:  Rp ${totalIncome.toLocaleString('id-ID')}`);
  console.log(`   Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   Sisa Pendapatan:   Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}`);
  console.log(`   Total Pinjaman:    Rp ${totalLoans.toLocaleString('id-ID')}`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   SISA KAS:          Rp ${(totalIncome - totalExpense - totalLoans).toLocaleString('id-ID')}`);

  console.log('\n✅ Import completed! Refresh your website to see the data.');

  await pool.end();
}

importData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

