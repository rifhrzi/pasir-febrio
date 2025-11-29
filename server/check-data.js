import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function checkData() {
  console.log('========================================');
  console.log('DATA DI DATABASE (sama dengan website)');
  console.log('========================================\n');

  // INCOMES
  console.log('=== INCOMES ===');
  const incomes = await pool.query('SELECT * FROM incomes ORDER BY trans_date DESC LIMIT 20');
  console.log(`Total: ${incomes.rowCount} records\n`);
  incomes.rows.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.trans_date} | ${row.category} | ${row.description?.substring(0, 40)} | Rp ${Number(row.amount).toLocaleString('id-ID')}`);
  });

  // Total by category
  const incomeByCategory = await pool.query('SELECT category, COUNT(*) as count, SUM(amount) as total FROM incomes GROUP BY category ORDER BY total DESC');
  console.log('\nIncome by Category:');
  incomeByCategory.rows.forEach(row => {
    console.log(`  ${row.category}: ${row.count} records = Rp ${Number(row.total).toLocaleString('id-ID')}`);
  });

  // EXPENSES
  console.log('\n\n=== EXPENSES ===');
  const expenses = await pool.query('SELECT * FROM expenses ORDER BY trans_date DESC LIMIT 30');
  console.log(`Total: ${expenses.rowCount} records\n`);
  expenses.rows.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.trans_date} | ${row.category} | ${row.description?.substring(0, 30)} | Rp ${Number(row.amount).toLocaleString('id-ID')}`);
  });

  // Total by category
  const expenseByCategory = await pool.query('SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
  console.log('\nExpense by Category:');
  expenseByCategory.rows.forEach(row => {
    console.log(`  ${row.category}: ${row.count} records = Rp ${Number(row.total).toLocaleString('id-ID')}`);
  });

  // LOANS
  console.log('\n\n=== LOANS ===');
  const loans = await pool.query('SELECT * FROM loans ORDER BY trans_date DESC');
  console.log(`Total: ${loans.rowCount} records\n`);
  loans.rows.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.trans_date} | ${row.category} | ${row.description?.substring(0, 40)} | Rp ${Number(row.amount).toLocaleString('id-ID')}`);
  });

  // SUMMARY
  const totalIncome = await pool.query('SELECT SUM(amount) as total FROM incomes');
  const totalExpense = await pool.query('SELECT SUM(amount) as total FROM expenses');
  const totalLoans = await pool.query('SELECT SUM(amount) as total FROM loans');

  const income = Number(totalIncome.rows[0].total) || 0;
  const expense = Number(totalExpense.rows[0].total) || 0;
  const loan = Number(totalLoans.rows[0].total) || 0;

  console.log('\n\n========================================');
  console.log('SUMMARY (harus sama dengan Dashboard)');
  console.log('========================================');
  console.log(`Total Pendapatan:  Rp ${income.toLocaleString('id-ID')}`);
  console.log(`Total Pengeluaran: Rp ${expense.toLocaleString('id-ID')}`);
  console.log(`Total Pinjaman:    Rp ${loan.toLocaleString('id-ID')}`);
  console.log(`Sisa Pendapatan:   Rp ${(income - expense).toLocaleString('id-ID')}`);
  console.log(`Sisa Kas:          Rp ${(income - expense - loan).toLocaleString('id-ID')}`);

  await pool.end();
}

checkData().catch(console.error);

