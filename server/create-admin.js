import bcrypt from 'bcrypt';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createAdmin() {
  const username = 'admin';
  const password = 'admin123';
  
  console.log('Creating admin user...');
  console.log('Username:', username);
  console.log('Password:', password);
  console.log('');
  
  try {
    // Generate password hash
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Password hash generated');
    
    // Delete existing admin user if exists
    await pool.query('DELETE FROM users WHERE username = $1', [username]);
    console.log('Deleted old admin user (if existed)');
    
    // Create new admin user
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, passwordHash]
    );
    
    console.log('');
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('');
    console.log('User ID:', result.rows[0].id);
    console.log('Created at:', result.rows[0].created_at);
    
  } catch (err) {
    console.error('❌ Error creating admin user:');
    console.error('Error message:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
    process.exit();
  }
}

createAdmin();
