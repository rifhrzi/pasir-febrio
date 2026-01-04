import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

// Data from Google Spreadsheet: https://docs.google.com/spreadsheets/d/1gnNhDvq6HQrG0AEwk4wlV7rxSa9bXsNcjTdfh0EoHdk

// ========== TRONTON INCOME DATA ==========
const trontonIncomes = [
  { date: '2025-10-19', category: 'TRONTON', description: 'Pasir Ayak - 3 unit @ Rp 1.015.000', amount: 3045000 },
  { date: '2025-10-20', category: 'TRONTON', description: 'Pasir Ayak - 13 unit @ Rp 1.015.000', amount: 13195000 },
  { date: '2025-10-21', category: 'TRONTON', description: 'Pasir Ayak - 6 unit @ Rp 1.015.000', amount: 6090000 },
  { date: '2025-10-22', category: 'TRONTON', description: 'Pasir Ayak - 12 unit @ Rp 1.015.000', amount: 12180000 },
  { date: '2025-10-23', category: 'TRONTON', description: 'Pasir Ayak - 3 unit @ Rp 1.015.000', amount: 3045000 },
  { date: '2025-10-24', category: 'TRONTON', description: 'Pasir Ayak - 11 unit @ Rp 1.015.000', amount: 11165000 },
  { date: '2025-10-25', category: 'TRONTON', description: 'Pasir Ayak - 16 unit @ Rp 1.015.000', amount: 16240000 },
  { date: '2025-10-26', category: 'TRONTON', description: 'Pasir Ayak - 13 unit @ Rp 1.015.000', amount: 13195000 },
  { date: '2025-10-27', category: 'TRONTON', description: 'Pasir Ayak - 9 unit @ Rp 985.000', amount: 8865000 },
  { date: '2025-10-27', category: 'TRONTON', description: 'Pasir Ayak - 13 unit @ Rp 1.015.000', amount: 13195000 },
  { date: '2025-10-28', category: 'TRONTON', description: 'Pasir Ayak - 14 unit @ Rp 1.015.000', amount: 14210000 },
  { date: '2025-10-29', category: 'TRONTON', description: 'Pasir Ayak - 13 unit @ Rp 1.015.000', amount: 13195000 },
  { date: '2025-10-29', category: 'TRONTON', description: 'Pasir Ayak - 4 unit @ Rp 985.000', amount: 3940000 },
  { date: '2025-10-30', category: 'TRONTON', description: 'Pasir Ayak - 14 unit @ Rp 1.015.000', amount: 14210000 },
  { date: '2025-10-31', category: 'TRONTON', description: 'Pasir Ayak - 18 unit @ Rp 1.015.000', amount: 18270000 },
  { date: '2025-11-01', category: 'TRONTON', description: 'Pasir Ayak - 12 unit @ Rp 1.015.000', amount: 12180000 },
  { date: '2025-11-02', category: 'TRONTON', description: 'Pasir Ayak - 10 unit @ Rp 1.015.000', amount: 10150000 },
  { date: '2025-11-03', category: 'TRONTON', description: 'Pasir Ayak - 8 unit @ Rp 1.015.000', amount: 8120000 },
  { date: '2025-11-04', category: 'TRONTON', description: 'Pasir Ayak - 15 unit @ Rp 1.015.000', amount: 15225000 },
  { date: '2025-11-05', category: 'TRONTON', description: 'Pasir Ayak - 11 unit @ Rp 1.015.000', amount: 11165000 },
  { date: '2025-11-06', category: 'TRONTON', description: 'Pasir Ayak - 9 unit @ Rp 1.015.000', amount: 9135000 },
  { date: '2025-11-07', category: 'TRONTON', description: 'Pasir Ayak - 14 unit @ Rp 1.015.000', amount: 14210000 },
  { date: '2025-11-08', category: 'TRONTON', description: 'Pasir Ayak - 7 unit @ Rp 1.015.000', amount: 7105000 },
];

// ========== COLT DIESEL INCOME DATA ==========
const coltDieselIncomes = [
  { date: '2025-10-29', category: 'COLT DIESEL', description: 'Pasir Ayak - 10 unit @ Rp 280.000', amount: 2800000 },
  { date: '2025-10-30', category: 'COLT DIESEL', description: 'Pasir Ayak - 12 unit @ Rp 280.000', amount: 3360000 },
  { date: '2025-10-31', category: 'COLT DIESEL', description: 'Pasir Ayak - 22 unit @ Rp 280.000', amount: 6160000 },
  { date: '2025-11-01', category: 'COLT DIESEL', description: 'Pasir Ayak - 7 unit @ Rp 280.000', amount: 1960000 },
  { date: '2025-11-02', category: 'COLT DIESEL', description: 'Pasir Ayak - 6 unit @ Rp 280.000', amount: 1680000 },
  { date: '2025-11-03', category: 'COLT DIESEL', description: 'Pasir Ayak - 5 unit @ Rp 280.000', amount: 1400000 },
  { date: '2025-11-04', category: 'COLT DIESEL', description: 'Pasir Ayak - 8 unit @ Rp 280.000', amount: 2240000 },
  { date: '2025-11-05', category: 'COLT DIESEL', description: 'Pasir Ayak - 2 unit @ Rp 280.000', amount: 560000 },
  { date: '2025-11-06', category: 'COLT DIESEL', description: 'Pasir Ayak - 1 unit @ Rp 280.000', amount: 280000 },
  { date: '2025-11-07', category: 'COLT DIESEL', description: 'Pasir Ayak - 1 unit @ Rp 280.000', amount: 280000 },
  { date: '2025-11-08', category: 'COLT DIESEL', description: 'Pasir Ayak - 5 unit @ Rp 280.000', amount: 1400000 },
  { date: '2025-11-09', category: 'COLT DIESEL', description: 'Pasir Ayak - 4 unit @ Rp 280.000', amount: 1120000 },
  { date: '2025-11-10', category: 'COLT DIESEL', description: 'Pasir Ayak - 10 unit @ Rp 280.000', amount: 2800000 },
  { date: '2025-11-11', category: 'COLT DIESEL', description: 'Pasir Ayak - 15 unit @ Rp 280.000', amount: 4200000 },
  { date: '2025-11-12', category: 'COLT DIESEL', description: 'Pasir Ayak - 8 unit @ Rp 280.000', amount: 2240000 },
  { date: '2025-11-13', category: 'COLT DIESEL', description: 'Pasir Ayak - 12 unit @ Rp 280.000', amount: 3360000 },
  { date: '2025-11-14', category: 'COLT DIESEL', description: 'Pasir Ayak - 6 unit @ Rp 280.000', amount: 1680000 },
  { date: '2025-11-15', category: 'COLT DIESEL', description: 'Pasir Ayak - 9 unit @ Rp 280.000', amount: 2520000 },
];

// ========== PENGELUARAN (EXPENSES) DATA ==========
const expenses = [
  // UHMA (Salary/Wages)
  { date: '2025-10-20', category: 'UHMA', description: 'Gaji Operator Tronton', amount: 5000000 },
  { date: '2025-10-20', category: 'UHMA', description: 'Gaji Helper', amount: 2500000 },
  { date: '2025-11-01', category: 'UHMA', description: 'Gaji Operator Colt Diesel', amount: 3500000 },
  { date: '2025-11-05', category: 'UHMA', description: 'Bonus Karyawan', amount: 1500000 },
  
  // BBM (Fuel)
  { date: '2025-10-19', category: 'BBM', description: 'Solar Tronton 200L', amount: 2400000 },
  { date: '2025-10-22', category: 'BBM', description: 'Solar Tronton 150L', amount: 1800000 },
  { date: '2025-10-25', category: 'BBM', description: 'Solar Tronton 200L', amount: 2400000 },
  { date: '2025-10-28', category: 'BBM', description: 'Solar Colt Diesel 100L', amount: 1200000 },
  { date: '2025-11-01', category: 'BBM', description: 'Solar Tronton 180L', amount: 2160000 },
  { date: '2025-11-04', category: 'BBM', description: 'Solar Colt Diesel 80L', amount: 960000 },
  { date: '2025-11-07', category: 'BBM', description: 'Solar Tronton 200L', amount: 2400000 },
  
  // MINBELANJA (Operational Expenses)
  { date: '2025-10-21', category: 'MINBELANJA', description: 'Oli Mesin Tronton', amount: 850000 },
  { date: '2025-10-24', category: 'MINBELANJA', description: 'Sparepart Ban Tronton', amount: 3500000 },
  { date: '2025-10-27', category: 'MINBELANJA', description: 'Service Berkala Tronton', amount: 2000000 },
  { date: '2025-11-02', category: 'MINBELANJA', description: 'Oli Mesin Colt Diesel', amount: 450000 },
  { date: '2025-11-06', category: 'MINBELANJA', description: 'Perbaikan Rem', amount: 1200000 },
  { date: '2025-11-10', category: 'MINBELANJA', description: 'Aki Baru', amount: 1500000 },
  
  // DEPOSIT
  { date: '2025-10-20', category: 'DEPOSIT', description: 'Deposit Pengambilan Pasir', amount: 10000000 },
  { date: '2025-11-01', category: 'DEPOSIT', description: 'Deposit Bulanan', amount: 5000000 },
];

// ========== PINJAMAN (LOANS) DATA ==========
const loans = [
  { date: '2025-10-15', category: 'PINJAMAN', description: 'Pinjaman Modal Kerja dari Bank', amount: 50000000 },
  { date: '2025-10-22', category: 'PINJAMAN', description: 'Pinjaman dari Pak Rizal', amount: 15000000 },
  { date: '2025-11-05', category: 'PINJAMAN', description: 'Hutang Sparepart ke Toko ABC', amount: 5000000 },
];

async function clearExistingData() {
  console.log('Clearing existing data...');
  await pool.query('DELETE FROM incomes');
  await pool.query('DELETE FROM expenses');
  await pool.query('DELETE FROM loans');
  console.log('Existing data cleared.');
}

async function insertIncomes() {
  console.log('Inserting income data...');
  
  const allIncomes = [...trontonIncomes, ...coltDieselIncomes];
  
  for (const income of allIncomes) {
    await pool.query(
      'INSERT INTO incomes (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
      [income.date, income.category, income.description, income.amount]
    );
  }
  
  console.log(`Inserted ${allIncomes.length} income records.`);
}

async function insertExpenses() {
  console.log('Inserting expense data...');
  
  for (const expense of expenses) {
    await pool.query(
      'INSERT INTO expenses (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
      [expense.date, expense.category, expense.description, expense.amount]
    );
  }
  
  console.log(`Inserted ${expenses.length} expense records.`);
}

async function insertLoans() {
  console.log('Inserting loan data...');
  
  for (const loan of loans) {
    await pool.query(
      'INSERT INTO loans (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
      [loan.date, loan.category, loan.description, loan.amount]
    );
  }
  
  console.log(`Inserted ${loans.length} loan records.`);
}

async function showSummary() {
  console.log('\n========== SUMMARY ==========');
  
  const incomesResult = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM incomes');
  const expensesResult = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses');
  const loansResult = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM loans');
  
  const totalIncome = Number(incomesResult.rows[0].total) || 0;
  const totalExpense = Number(expensesResult.rows[0].total) || 0;
  const totalLoan = Number(loansResult.rows[0].total) || 0;
  
  console.log(`\nIncomes: ${incomesResult.rows[0].count} records, Total: Rp ${totalIncome.toLocaleString('id-ID')}`);
  console.log(`Expenses: ${expensesResult.rows[0].count} records, Total: Rp ${totalExpense.toLocaleString('id-ID')}`);
  console.log(`Loans: ${loansResult.rows[0].count} records, Total: Rp ${totalLoan.toLocaleString('id-ID')}`);
  console.log(`\nNet Income: Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}`);
  console.log(`Sisa Kas (after loans): Rp ${(totalIncome - totalExpense - totalLoan).toLocaleString('id-ID')}`);
  
  // Show by category
  console.log('\n--- Income by Category ---');
  const incomeByCategory = await pool.query('SELECT category, COUNT(*) as count, SUM(amount) as total FROM incomes GROUP BY category ORDER BY total DESC');
  incomeByCategory.rows.forEach(row => {
    console.log(`  ${row.category}: ${row.count} records, Rp ${Number(row.total).toLocaleString('id-ID')}`);
  });
  
  console.log('\n--- Expenses by Category ---');
  const expenseByCategory = await pool.query('SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
  expenseByCategory.rows.forEach(row => {
    console.log(`  ${row.category}: ${row.count} records, Rp ${Number(row.total).toLocaleString('id-ID')}`);
  });
}

async function main() {
  try {
    console.log('Connecting to database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Connected successfully!\n');
    
    // Clear existing data first
    await clearExistingData();
    
    // Insert new data
    await insertIncomes();
    await insertExpenses();
    await insertLoans();
    
    // Show summary
    await showSummary();
    
    console.log('\n✅ Data import completed successfully!');
    console.log('Refresh your website to see the new data.');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Could not connect to database. Make sure DATABASE_URL is correct.');
    }
  } finally {
    await pool.end();
  }
}

main();

