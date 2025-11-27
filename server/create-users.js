import bcrypt from 'bcrypt';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createUsers() {
  console.log('=================================');
  console.log('Creating Users with Roles');
  console.log('=================================\n');
  
  try {
    // Step 1: Add role column to users table if it doesn't exist
    console.log('1. Adding role column to users table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin'
    `);
    console.log('   ✅ Role column added\n');

    // Step 2: Update existing admin user to have admin role
    console.log('2. Updating existing admin user...');
    await pool.query(`UPDATE users SET role = 'admin' WHERE username = 'admin'`);
    console.log('   ✅ Admin user updated\n');

    // Step 3: Create view-only users
    const viewerUsers = [
      { username: 'viewer1', password: 'viewer123' },
      { username: 'viewer2', password: 'viewer123' }
    ];

    console.log('3. Creating view-only users...\n');

    for (const user of viewerUsers) {
      // Delete if exists
      await pool.query('DELETE FROM users WHERE username = $1', [user.username]);
      
      // Generate password hash
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // Create user with viewer role
      const result = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
        [user.username, passwordHash, 'viewer']
      );
      
      console.log(`   ✅ Created: ${result.rows[0].username} (role: ${result.rows[0].role})`);
      console.log(`      Password: ${user.password}`);
    }

    console.log('\n=================================');
    console.log('USER CREDENTIALS');
    console.log('=================================\n');
    
    console.log('ADMIN (Full Access):');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  Role: admin');
    console.log('  Can: View, Add, Edit, Delete\n');
    
    console.log('VIEWER 1 (View Only):');
    console.log('  Username: viewer1');
    console.log('  Password: viewer123');
    console.log('  Role: viewer');
    console.log('  Can: View only\n');
    
    console.log('VIEWER 2 (View Only):');
    console.log('  Username: viewer2');
    console.log('  Password: viewer123');
    console.log('  Role: viewer');
    console.log('  Can: View only\n');

    console.log('=================================');
    console.log('✅ All users created successfully!');
    console.log('=================================\n');

    // Show all users
    const { rows } = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id');
    console.log('Current Users in Database:');
    console.table(rows);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

createUsers();

