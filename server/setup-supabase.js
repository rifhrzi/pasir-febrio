import pkg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    // Create tables
    console.log('Creating tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS incomes (
        id SERIAL PRIMARY KEY,
        trans_date DATE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        amount NUMERIC(18,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        trans_date DATE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        amount NUMERIC(18,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        trans_date DATE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        amount NUMERIC(18,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tables created!');

    // Create admin user
    console.log('Creating admin user...');
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO UPDATE SET password_hash = $2, role = $3`,
      ['admin', adminHash, 'admin']
    );
    console.log('Admin user created! (admin / admin123)');

    // Create dzikri123 user
    console.log('Creating dzikri123 user...');
    const dzikri123Hash = await bcrypt.hash('dzikri123', 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO UPDATE SET password_hash = $2, role = $3`,
      ['dzikri123', dzikri123Hash, 'viewer']
    );
    console.log('dzikri123 user created! (dzikri123 / dzikri123)');

    // Check tables
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', result.rows.map(r => r.table_name));

    console.log('\n✅ Setup complete!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

setup();


