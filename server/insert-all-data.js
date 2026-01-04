import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function insertData() {
  try {
    // ==================== COLTDIESEL (Income) ====================
    console.log('\n📦 Inserting COLTDIESEL income data...');
    
    const coltdieselData = [
      { date: '2025-11-19', category: 'COLTDIESEL', description: 'Pasir Ayak - 8 unit @ Rp 300.000 (Loading: 160.000)', amount: 2240000 },
      { date: '2025-11-20', category: 'COLTDIESEL', description: 'Pasir Ayak - 15 unit @ Rp 300.000 (Loading: 300.000)', amount: 4200000 },
      { date: '2025-11-21', category: 'COLTDIESEL', description: 'Pasir Ayak - 6 unit @ Rp 300.000 (Loading: 120.000)', amount: 1680000 },
      { date: '2025-11-22', category: 'COLTDIESEL', description: 'Pasir Ayak - 15 unit @ Rp 300.000 (Loading: 300.000)', amount: 4200000 },
    ];

    for (const row of coltdieselData) {
      await pool.query(
        'INSERT INTO incomes (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
        [row.date, row.category, row.description, row.amount]
      );
      console.log(`  ✓ ${row.date} - Rp ${row.amount.toLocaleString()}`);
    }

    // ==================== EXPANDING (Expenses) ====================
    console.log('\n💸 Inserting EXPANDING expense data...');
    
    const expandingData = [
      // 19/11/2025 - Rabu
      { date: '2025-11-19', category: 'UANG HARIAN', description: 'Operator: Telong, Menyon (2 orang)', amount: 800000 },
      { date: '2025-11-19', category: 'UANG HARIAN', description: 'Checker: Hikmal (1 orang)', amount: 200000 },
      { date: '2025-11-19', category: 'UANG HARIAN', description: 'Pengawas: Gofar (1 orang)', amount: 400000 },
      { date: '2025-11-19', category: 'UANG HARIAN', description: 'Admin: Rio (1 orang)', amount: 300000 },
      { date: '2025-11-19', category: 'LAPANGAN', description: 'Makan Minum Lapangan Pagi Malam (2x)', amount: 240000 },
      { date: '2025-11-19', category: 'LAPANGAN', description: 'Pembayaran Warung', amount: 94000 },
      { date: '2025-11-19', category: 'LAPANGAN', description: 'Admin Bank Setor Tunai BRILINK', amount: 20000 },
      { date: '2025-11-19', category: 'BBM', description: 'BBM 500L: H IFAN', amount: 5000000 },

      // 20/11/2025 - Kamis
      { date: '2025-11-20', category: 'UANG HARIAN', description: 'Operator: Fat, Arsad (2 orang)', amount: 800000 },
      { date: '2025-11-20', category: 'UANG HARIAN', description: 'Checker: Revan (1 orang)', amount: 200000 },
      { date: '2025-11-20', category: 'UANG HARIAN', description: 'Pengawas: Gofar (1 orang)', amount: 400000 },
      { date: '2025-11-20', category: 'LAPANGAN', description: 'Makan Minum Lapangan Pagi Malam (2x)', amount: 150000 },
      { date: '2025-11-20', category: 'LAPANGAN', description: 'Admin Bank Setor Tunai BRILINK', amount: 5000 },
      { date: '2025-11-20', category: 'BBM', description: 'BBM 500L: H IFAN', amount: 5000000 },

      // 21/11/2025 - Jumat
      { date: '2025-11-21', category: 'UANG HARIAN', description: 'Operator: Telong, Menyon (2 orang)', amount: 800000 },
      { date: '2025-11-21', category: 'UANG HARIAN', description: 'Checker: Hikmal (1 orang)', amount: 200000 },
      { date: '2025-11-21', category: 'UANG HARIAN', description: 'Pengawas: Gofar (1 orang)', amount: 400000 },
      { date: '2025-11-21', category: 'LAPANGAN', description: 'Makan Minum Lapangan Pagi Malam (2x)', amount: 250000 },
      { date: '2025-11-21', category: 'BBM', description: 'BBM 600L: H IFAN', amount: 6000000 },
      { date: '2025-11-21', category: 'BBM', description: 'BBM SOLAR: YADI HARIYADI (HUTANG)', amount: 30000000 },

      // 22/11/2025 - Sabtu
      { date: '2025-11-22', category: 'UANG HARIAN', description: 'Operator: Fat, Arsad (2 orang)', amount: 800000 },
      { date: '2025-11-22', category: 'UANG HARIAN', description: 'Checker: Revan (1 orang)', amount: 200000 },
      { date: '2025-11-22', category: 'UANG HARIAN', description: 'Pengawas: Gofar (1 orang)', amount: 400000 },
      { date: '2025-11-22', category: 'LAPANGAN', description: 'Makan Minum Lapangan Pagi Malam (2x)', amount: 150000 },
      { date: '2025-11-22', category: 'LAPANGAN', description: 'Admin Bank Setor Tunai BRILINK', amount: 10000 },
      { date: '2025-11-22', category: 'BELANJA', description: 'Belanja Kebutuhan Alat: F Solar, F Tangan, Baut, Las Kuku Beko (4 item)', amount: 1110000 },
      { date: '2025-11-22', category: 'BBM', description: 'BBM 700L: H IFAN', amount: 7000000 },
    ];

    for (const row of expandingData) {
      await pool.query(
        'INSERT INTO expenses (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
        [row.date, row.category, row.description, row.amount]
      );
      console.log(`  ✓ ${row.date} - ${row.category} - Rp ${row.amount.toLocaleString()}`);
    }

    // ==================== Summary ====================
    console.log('\n📊 SUMMARY:');
    
    const incomeResult = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM incomes');
    console.log(`\n💰 INCOME (Pemasukan):`);
    console.log(`   Total entries: ${incomeResult.rows[0].count}`);
    console.log(`   Total amount: Rp ${Number(incomeResult.rows[0].total).toLocaleString()}`);

    const expenseResult = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses');
    console.log(`\n💸 EXPENSES (Pengeluaran):`);
    console.log(`   Total entries: ${expenseResult.rows[0].count}`);
    console.log(`   Total amount: Rp ${Number(expenseResult.rows[0].total).toLocaleString()}`);

    const netProfit = Number(incomeResult.rows[0].total) - Number(expenseResult.rows[0].total);
    console.log(`\n📈 NET PROFIT: Rp ${netProfit.toLocaleString()}`);

    console.log('\n✅ All data inserted successfully!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

insertData();


