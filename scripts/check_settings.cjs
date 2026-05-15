const { neon } = require('@neondatabase/serverless');

const MASTER_DB_URL = "postgresql://neondb_owner:npg_24CIQVivOwEg@ep-dawn-cell-a958vnes-pooler.gwc.azure.neon.tech/neondb?sslmode=require";
const sql = neon(MASTER_DB_URL);

async function checkSettings() {
  try {
    const rows = await sql`SELECT * FROM system_settings`;
    console.log('--- SYSTEM SETTINGS DIAGNOSTIC ---');
    console.log('Rows found:', rows.length);
    rows.forEach(r => {
      console.log(`ID: ${r.id}`);
      console.log(`Provider: ${r.active_llm_provider}`);
      console.log(`Config: ${JSON.stringify(r.llm_config)}`);
      console.log('---');
    });
  } catch (err) {
    console.error('Settings Diagnostic Failed:', err.message);
  }
}

checkSettings();
