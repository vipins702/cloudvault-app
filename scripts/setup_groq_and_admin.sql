-- CLOUDVAULT: MULTI-MODEL CONFIGURATION & ADMIN SETUP
-- Run this in your Neon SQL Console

-- 1. Create system_settings if not exists
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(50) PRIMARY KEY,
  active_llm_provider VARCHAR(50) DEFAULT 'openai',
  llm_config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Plan Tier to Users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) DEFAULT 'free';

-- 3. Insert/Update Admin User
-- Password "Hashing#1234" hashed to base64 (matching your app's hashPassword function)
INSERT INTO users (id, email, tenant_id, name, password_hash, plan_tier)
VALUES (
  'e2b8f3a0-1234-4567-89ab-cdef12345678', -- Valid UUID for admin
  'vipins702@gmail.com',
  'a0542d07-e77e-47b5-b5c3-012463615e43', -- Using your active tenant ID
  'Admin',
  'SGFzaGluZyMxMjM0', -- Base64 of Hashing#1234
  'premium'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  plan_tier = 'premium';

-- 4. Update LLM Config with Groq and Qwen
INSERT INTO system_settings (id, active_llm_provider, llm_config)
VALUES (
  'global', 
  'groq', 
  '{
    "openai_api_key": "",
    "openai_model": "gpt-4o-mini",
    "gemini_api_key": "",
    "gemini_model": "gemini-1.5-flash",
    "groq_api_key": "YOUR_GROQ_API_KEY",
    "groq_model": "qwen-32b",
    "premium_models": ["gpt-4o-mini", "gemini-1.5-flash"],
    "free_models": ["qwen-32b"]
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET 
  llm_config = system_settings.llm_config || EXCLUDED.llm_config,
  updated_at = NOW();

-- 5. Verify
SELECT * FROM system_settings;
SELECT email, name, plan_tier FROM users WHERE email = 'vipins702@gmail.com';
