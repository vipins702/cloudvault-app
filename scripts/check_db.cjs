const { neon } = require('@neondatabase/serverless');

const MASTER_DB_URL = "postgresql://neondb_owner:npg_24CIQVivOwEg@ep-dawn-cell-a958vnes-pooler.gwc.azure.neon.tech/neondb?sslmode=require";
const sql = neon(MASTER_DB_URL);

async function checkDb() {
  try {
    const rows = await sql`SELECT id, tenant_id, provider, credentials_encrypted FROM storage_connections LIMIT 5`;
    console.log('--- DATABASE DIAGNOSTIC ---');
    console.log('Rows found:', rows.length);
    rows.forEach(r => {
      console.log(`Provider: ${r.provider}`);
      console.log(`TenantID: ${r.tenant_id}`);
      console.log(`Raw Credentials: ${r.credentials_encrypted}`);
      console.log('---');
    });
  } catch (err) {
    console.error('DB Diagnostic Failed:', err.message);
  }
}

checkDb();
