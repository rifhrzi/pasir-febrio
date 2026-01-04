import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function addProofColumn() {
  console.log('Adding proof_image column to expenses table...\n');

  try {
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'expenses' AND column_name = 'proof_image'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column proof_image already exists!');
    } else {
      // Add column
      await pool.query(`
        ALTER TABLE expenses ADD COLUMN proof_image TEXT
      `);
      console.log('✅ Column proof_image added successfully!');
    }

    // Show table structure
    console.log('\nCurrent expenses table structure:');
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'expenses'
      ORDER BY ordinal_position
    `);

    structureResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addProofColumn();

