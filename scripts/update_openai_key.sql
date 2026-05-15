-- CLOUDVAULT: UPDATE OPENAI KEY IN DATABASE
-- Run this in your Neon SQL Console to enable AI Features

-- 1. Create the settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(50) PRIMARY KEY,
  active_llm_provider VARCHAR(50) DEFAULT 'openai',
  llm_config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert or Update your OpenAI Key
-- REPLACE 'YOUR_OPENAI_KEY_HERE' with the key you shared
INSERT INTO system_settings (id, active_llm_provider, llm_config)
VALUES (
  'global', 
  'openai', 
  '{"openai_api_key": "YOUR_OPENAI_KEY_HERE", "openai_model": "gpt-4o-mini"}'
)
ON CONFLICT (id) DO UPDATE SET 
  llm_config = EXCLUDED.llm_config,
  updated_at = NOW();

-- 3. Verify
SELECT * FROM system_settings;
