const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// LOAD ENV FIRST — before anything reads process.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');
const SaaSVault = require('./utils/crypto.cjs');
const AIService = require('./services/ai-service.cjs');

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cloudvault-super-secret-key';
const sql = neon(process.env.VITE_NEON_DB_URL);

// GOOGLE AUTH CONFIG
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const getRedirectUri = (req) => {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const host = req.get('host');
  // Force https for Vercel or if the protocol is already https
  const protocol = host.includes('vercel.app') ? 'https' : req.protocol;
  return `${protocol}://${host}/auth/google/callback`;
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- STATIC FILES (Privacy Policy, Terms of Service) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
  res.json({ status: 'Online', message: 'CloudVault API is running on Vercel' });
});

// --- UTILS ---
const hashPassword = (password) => Buffer.from(password).toString('base64');

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- VERCEL TOKEN HELPER ---
const getVercelToken = async (tenantId) => {
  try {
    const results = await sql`
      SELECT credentials_encrypted 
      FROM storage_connections 
      WHERE tenant_id = ${tenantId} AND provider = 'vercel-blob' LIMIT 1
    `;
    if (results[0] && results[0].credentials_encrypted) {
      try {
        const creds = JSON.parse(results[0].credentials_encrypted);
        return creds.token;
      } catch (e) { return null; }
    }
  } catch (e) {
    console.error('Error fetching token:', e.message);
  }
  return process.env.BLOB_READ_WRITE_TOKEN;
};

// ========== AUTH ROUTES ==========

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let users = await sql`SELECT * FROM users WHERE email = ${email}`;
    let user = users[0];
    
    // AUTO-CREATE DEMO USER IF MISSING
    if (!user && email === 'admin@cloudvault.com') {
      const tenantId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      await sql`INSERT INTO tenants (id, name, slug) VALUES (${tenantId}, 'Demo Vault', 'demo-vault')`;
      await sql`INSERT INTO users (id, email, tenant_id, name, password_hash) VALUES (${userId}, ${email}, ${tenantId}, 'Admin', ${hashPassword('admin123')})`;
      users = await sql`SELECT * FROM users WHERE email = ${email}`;
      user = users[0];
    }

    if (!user) return res.status(400).json({ error: 'User not found' });

    if (user.password_hash !== hashPassword(password)) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email
    }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenant_id }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, tenantId: req.user.tenantId });
});

// ========== GALLERY ROUTES ==========

app.get('/api/gallery', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.json([]);
    const connections = await sql`
      SELECT id, provider, credentials_encrypted 
      FROM storage_connections 
      WHERE tenant_id = ${tenantId} AND is_active = true
    `;
    res.json(connections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cloud/photos', authenticateToken, async (req, res) => {
  try {
    const token = await getVercelToken(req.user.tenantId);
    if (!token) return res.json([]);
    const response = await fetch(`https://blob.vercel-storage.com?v=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    res.json(data.blobs || []);
  } catch (err) {
    res.json([]);
  }
});

// ========== CONNECTIONS ROUTES ==========

app.get('/api/connections', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.json([]);
    const rows = await sql`SELECT provider FROM storage_connections WHERE tenant_id = ${tenantId}`;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/link-cloud', authenticateToken, async (req, res) => {
  const { provider, token, name } = req.body;
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new Error("Tenant ID missing in token");
    const encryptedToken = SaaSVault.encrypt(token);
    const creds = JSON.stringify({ token: encryptedToken });
    await sql`
      INSERT INTO storage_connections (id, tenant_id, provider, name, credentials_encrypted, is_active, updated_at)
      VALUES (${crypto.randomUUID()}, ${tenantId}, ${provider}, ${name}, ${creds}, true, ${new Date().toISOString()})
    `;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== AI ROUTES ==========

app.get('/api/ai/duplicates', authenticateToken, async (req, res) => {
  try {
    const duplicates = await AIService.findDuplicates(sql, req.user.tenantId);
    res.json(duplicates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== GOOGLE OAUTH PROXY ==========

app.get('/auth/google', (req, res) => {
  const redirectUri = getRedirectUri(req);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile%20https://www.googleapis.com/auth/photoslibrary.readonly&access_type=offline&prompt=consent`;
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  const redirectUri = getRedirectUri(req);
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await response.json();

    if (!tokens.access_token) {
      return res.status(400).send('Google OAuth failed: ' + JSON.stringify(tokens));
    }

    const encryptedToken = SaaSVault.encrypt(tokens.access_token);
    const deepLink = `cloudvault://auth?token=${encodeURIComponent(encryptedToken)}&provider=google-photos`;

    // Send a success page that works on BOTH web and mobile
    res.send(`<!DOCTYPE html>
      <html><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CloudVault - Connected!</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .card { text-align: center; padding: 50px; max-width: 420px; }
          .icon { font-size: 64px; margin-bottom: 20px; }
          h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
          p { color: #94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
          .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #10b981; padding: 8px 20px; border-radius: 30px; font-weight: 700; font-size: 14px; letter-spacing: 1px; }
          .info { color: #475569; font-size: 13px; margin-top: 30px; }
        </style>
      </head><body>
        <div class="card">
          <div class="icon">🔗</div>
          <h1>Google Photos Connected!</h1>
          <p>Your Google Photos library has been securely linked to CloudVault. You can now close this window and return to the app.</p>
          <div class="badge">✓ INTEGRATION COMPLETE</div>
          <p class="info">If the app didn't open automatically, go back to CloudVault on your device.</p>
        </div>
        <script>
          // Try to open the mobile app via deep link
          try { window.location.href = "${deepLink}"; } catch(e) {}
        </script>
      </body></html>`);
  } catch (err) {
    res.status(500).send('OAuth Handshake Failed: ' + err.message);
  }
});

// ========== START ==========

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`CloudVault Backend running on http://0.0.0.0:${port}`);
  });
}

module.exports = app;
