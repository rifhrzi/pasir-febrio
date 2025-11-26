import bcrypt from 'bcrypt';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testLogin() {
  const username = 'admin';
  const password = 'admin123';
  
  console.log('Testing login for:', username);
  console.log('Password:', password);
  console.log('');
  
  try {
    // Get user from database
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database!');
      console.log('Run: node create-admin.js');
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ User found in database');
    console.log('User ID:', user.id);
    console.log('Username:', user.username);
    console.log('Password hash from DB:', user.password_hash);
    console.log('');
    
    // Test password comparison
    console.log('Testing password comparison...');
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (match) {
      console.log('✅ PASSWORD MATCHES!');
      console.log('Login should work with:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
    } else {
      console.log('❌ PASSWORD DOES NOT MATCH!');
      console.log('The hash in database does not match the password.');
      console.log('');
      console.log('Creating new hash...');
      const newHash = await bcrypt.hash(password, 10);
      console.log('New hash:', newHash);
      console.log('');
      console.log('Updating database...');
      await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [newHash, username]);
      console.log('✅ Password updated! Try logging in now.');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

testLogin();



