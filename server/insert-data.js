import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function insertData() {
  try {
    console.log('Inserting TRONTON data...');
    
    // TRONTON data from Excel
    const trontonData = [
      // 19/11/2025 - Rabu
      { date: '2025-11-19', category: 'TRONTON', description: 'Pasir Ayak - 13 unit @ Rp 1.100.000 (Loading: 650.000, Market: 455.000)', amount: 13195000 },
      { date: '2025-11-19', category: 'TRONTON', description: 'Pasir Ayak - 1 unit @ Rp 1.100.000 (Loading: 50.000, Market: 35.000, DO: 50.000)', amount: 965000 },
      
      // 20/11/2025 - Kamis
      { date: '2025-11-20', category: 'TRONTON', description: 'Pasir Ayak - 9 unit @ Rp 1.100.000 (Loading: 450.000, Market: 315.000)', amount: 9135000 },
      { date: '2025-11-20', category: 'TRONTON', description: 'Pasir Ayak - 3 unit @ Rp 1.100.000 (Loading: 150.000, Market: 105.000, DO: 150.000)', amount: 2895000 },
      
      // 21/11/2025 - Jumat
      { date: '2025-11-21', category: 'TRONTON', description: 'Pasir Ayak - 9 unit @ Rp 1.100.000 (Loading: 450.000, Market: 315.000)', amount: 9135000 },
      { date: '2025-11-21', category: 'TRONTON', description: 'Pasir Ayak - 9 unit @ Rp 1.100.000 (Loading: 450.000, Market: 315.000, DO: 450.000)', amount: 8685000 },
      
      // 22/11/2025 - Sabtu
      { date: '2025-11-22', category: 'TRONTON', description: 'Pasir Ayak - 14 unit @ Rp 1.100.000 (Loading: 700.000, Market: 490.000)', amount: 14210000 },
      { date: '2025-11-22', category: 'TRONTON', description: 'Pasir Ayak - 4 unit @ Rp 1.100.000 (Loading: 200.000, Market: 140.000, DO: 200.000)', amount: 3860000 },
    ];

    // Insert each row
    for (const row of trontonData) {
      await pool.query(
        'INSERT INTO incomes (trans_date, category, description, amount) VALUES ($1, $2, $3, $4)',
        [row.date, row.category, row.description, row.amount]
      );
      console.log(`Inserted: ${row.date} - ${row.description.substring(0, 30)}... = Rp ${row.amount.toLocaleString()}`);
    }

    // Verify
    const result = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM incomes');
    console.log(`\n✅ Total entries: ${result.rows[0].count}`);
    console.log(`✅ Total amount: Rp ${Number(result.rows[0].total).toLocaleString()}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

insertData();


