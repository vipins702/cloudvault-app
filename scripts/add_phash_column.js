const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.VITE_NEON_DB_URL);

async function main() {
  try {
    console.log('Adding phash column to files table...');
    await sql`
      ALTER TABLE files 
      ADD COLUMN IF NOT EXISTS phash VARCHAR(64);
    `;
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
