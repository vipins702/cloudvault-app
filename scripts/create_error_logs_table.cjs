const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.VITE_NEON_DB_URL);

async function main() {
  try {
    console.log('Creating error_logs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS error_logs (
        id UUID PRIMARY KEY,
        tenant_id UUID,
        user_id UUID,
        action VARCHAR(50),
        error_message TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
