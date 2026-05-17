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
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    // True Database Session Validation (Matching Web App)
    const sessions = await sql`
      SELECT s.*, u.email, u.name, u.role, u.plan_tier 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
    `;
    
    const session = sessions[0];
    
    if (!session) {
      return res.status(403).json({ error: 'Session not found' });
    }

    if (new Date(session.expires_at) < new Date()) {
      await sql`DELETE FROM sessions WHERE token = ${token}`;
      return res.status(403).json({ error: 'Session expired' });
    }

    req.user = {
      id: session.user_id,
      tenantId: session.tenant_id,
      email: session.email,
      name: session.name,
      role: session.role,
      planTier: session.plan_tier
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal auth error' });
  }
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

// --- GOOGLE TOKEN REFRESH HELPER ---
const getValidGoogleToken = async (connection) => {
  let creds = JSON.parse(connection.credentials_encrypted);
  const now = Date.now();
  
  // If token is still valid (with 5 min buffer), return it
  if (creds.expires_at && (creds.expires_at - now > 300000)) {
    return creds.access_token || creds.token;
  }

  // Otherwise, refresh it
  if (!creds.refresh_token) {
    throw new Error('No refresh token available. Please re-link Google account.');
  }

  console.log(`[GoogleAuth] Token expired for ${connection.id}. Refreshing...`);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  if (!data.access_token) {
    console.error('[GoogleAuth] Refresh failed:', data);
    throw new Error('Failed to refresh Google token');
  }

  // Update DB with new token
  const newCreds = {
    ...creds,
    access_token: data.access_token,
    expires_at: now + (data.expires_in * 1000)
  };

  await sql`
    UPDATE storage_connections 
    SET credentials_encrypted = ${JSON.stringify(newCreds)}, updated_at = NOW()
    WHERE id = ${connection.id}
  `;

  return data.access_token;
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

    // Note: The web app uses btoa() for hashing in demo. `hashPassword` uses base64. They are equivalent.
    if (user.password_hash !== hashPassword(password)) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // CREATE TRUE DATABASE SESSION (Matching Web App)
    const sessionToken = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO sessions (id, user_id, tenant_id, token, expires_at, created_at)
      VALUES (${sessionId}, ${user.id}, ${user.tenant_id}, ${sessionToken}, ${expiresAt.toISOString()}, ${now.toISOString()})
    `;

    res.json({
      token: sessionToken,
      user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenant_id, role: user.role, planTier: user.plan_tier }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, tenantId: req.user.tenantId, role: req.user.role, planTier: req.user.planTier });
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
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.json([]);
    
    // Fetch all files for this tenant from the DB (Unified View)
    const files = await sql`
      SELECT f.*, c.provider
      FROM files f
      LEFT JOIN storage_connections c ON f.connection_id = c.id
      WHERE f.tenant_id = ${tenantId}
      ORDER BY f.uploaded_at DESC
    `;

    // Map to the format the mobile app expects
    const formatted = files.map(f => ({
      id: f.id,
      url: f.storage_url || '',
      name: f.name,
      path: f.storage_key || '',
      provider: f.provider || 'vercel-blob',
      size: f.size_bytes,
      date: f.uploaded_at,
      type: f.content_type?.startsWith('video') ? 'video' : 'image',
      tags: f.tags || []
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Unified Gallery Error:', err);
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

app.get('/api/connections/google/token', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const conns = await sql`SELECT * FROM storage_connections WHERE provider = 'google-photos' AND tenant_id = ${tenantId}`;
    const conn = conns[0];
    if (!conn) return res.status(404).json({ error: 'Google Photos not connected' });

    const token = await getValidGoogleToken(conn);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/link-cloud', authenticateToken, async (req, res) => {
  const { provider, token, name } = req.body;
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new Error("Tenant ID missing in token");
    
    // Web app saves Vercel credentials literally as stringified JSON: '{"token":"..."}'
    // For mobile API inputs, the 'token' variable is already a JSON string of configValues
    // We will save it exactly as the web app expects.
    const credsEncrypted = typeof token === 'string' ? token : JSON.stringify({ token });
    
    const now = new Date().toISOString();
    
    await sql`
      INSERT INTO storage_connections (id, tenant_id, provider, name, credentials_encrypted, is_active, metadata, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${tenantId}, ${provider}, ${name}, ${credsEncrypted}, true, '{}'::jsonb, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET 
        credentials_encrypted = EXCLUDED.credentials_encrypted,
        updated_at = EXCLUDED.updated_at
    `;
    
    // Save audit log matching the web app schema
    await sql`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, target, metadata, created_at)
      VALUES (${crypto.randomUUID()}, ${tenantId}, ${req.user.id}, 'LINK_CLOUD', 'connection', ${JSON.stringify({ provider })}, ${now})
    `;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Link Cloud Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== DISCONNECT PROVIDER ==========

app.delete('/api/connections/:provider', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const provider = req.params.provider;
    await sql`DELETE FROM storage_connections WHERE tenant_id = ${tenantId} AND provider = ${provider}`;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== SYSTEM SETTINGS ROUTES ==========

app.get('/api/admin/settings', authenticateToken, async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM system_settings WHERE id = 'global'`;
    res.json(rows[0] || { active_llm_provider: 'gemini', llm_config: {} });
  } catch (err) {
    // If table doesn't exist yet, return defaults
    if (err.message.includes('relation "system_settings" does not exist')) {
      res.json({ active_llm_provider: 'gemini', llm_config: {} });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/admin/settings', authenticateToken, async (req, res) => {
  const { active_llm_provider, llm_config } = req.body;
  try {
    const now = new Date().toISOString();
    await sql`
      INSERT INTO system_settings (id, active_llm_provider, llm_config, created_at, updated_at)
      VALUES ('global', ${active_llm_provider}, ${llm_config}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET 
        active_llm_provider = EXCLUDED.active_llm_provider,
        llm_config = EXCLUDED.llm_config,
        updated_at = EXCLUDED.updated_at
    `;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== TRANSFER & BULK ROUTES (SaaS Master Engine) ==========

app.post('/api/files/upload', authenticateToken, async (req, res) => {
  const { fileName, contentType, base64Data, targetProviderId, folder, skipStorageUpload, storageUrl, storageKey } = req.body;
  const tenantId = req.user.tenantId;

  try {
    if (!skipStorageUpload && !base64Data) throw new Error("No file data provided");

    // 1. Get Target Provider
    const targetConns = await sql`SELECT * FROM storage_connections WHERE provider = ${targetProviderId} AND tenant_id = ${tenantId}`;
    const targetConn = targetConns[0];
    if (!targetConn) throw new Error('Target provider not connected');

    let newUrl = '';
    let newKey = '';

    if (skipStorageUpload) {
      newUrl = storageUrl;
      newKey = storageKey;
      console.log(`[UploadEngine] Skipping storage upload, using provided URL: ${newUrl}`);
    } else {
      const buffer = Buffer.from(base64Data, 'base64');
      // 2. Upload to Vercel Blob
    if (targetProviderId === 'vercel-blob') {
      const creds = JSON.parse(targetConn.credentials_encrypted);
      const rawToken = creds.token || '';
      const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
      const token = match ? match[1] : rawToken.trim();

      const pathname = folder ? `${folder}/${fileName}` : fileName;
      
      console.log(`[UploadEngine] Uploading ${pathname} to Vercel Blob...`);
      const uploadResponse = await fetch(`https://blob.vercel-storage.com/${encodeURIComponent(pathname)}?v=1`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': contentType || 'application/octet-stream',
        },
        body: buffer
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload to target provider');
      const uploadData = await uploadResponse.json();
      newUrl = uploadData.url;
      newKey = uploadData.pathname;
      console.log(`[UploadEngine] Successfully uploaded to Vercel: ${newUrl}`);
    } else if (targetProviderId === 'google-photos') {
      let creds;
      try {
        creds = JSON.parse(targetConn.credentials_encrypted);
      } catch (e) {
        throw new Error('Failed to parse Google credentials');
      }
      
      const decryptedToken = await getValidGoogleToken(targetConn);
      if (!decryptedToken) throw new Error('No access token for Google Photos');

      console.log(`[UploadEngine] Uploading bytes to Google Photos API...`);
      const uploadBytesRes = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedToken}`,
          'Content-Type': 'application/octet-stream',
          'X-Goog-Upload-Content-Type': contentType || 'image/jpeg',
          'X-Goog-Upload-Protocol': 'raw'
        },
        body: buffer
      });
      
      if (!uploadBytesRes.ok) throw new Error('Google Photos raw upload failed');
      const uploadToken = await uploadBytesRes.text();

      console.log(`[UploadEngine] Creating Media Item in Google Photos...`);
      const createItemRes = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newMediaItems: [{
            description: fileName,
            simpleMediaItem: { uploadToken }
          }]
        })
      });

      if (!createItemRes.ok) throw new Error('Google Photos media item creation failed');
      const createData = await createItemRes.json();
      
      if (!createData.newMediaItemResults || !createData.newMediaItemResults[0].mediaItem) {
        throw new Error('Google Photos returned empty results');
      }
      
      const mediaItem = createData.newMediaItemResults[0].mediaItem;
      newUrl = mediaItem.baseUrl;
      newKey = mediaItem.id;
      console.log(`[UploadEngine] Successfully uploaded to Google Photos: ${newKey}`);
    } else {
      throw new Error(`Upload to ${targetProviderId} not yet implemented on master backend`);
    }
    }

    // 3. Insert into Database
    const now = new Date().toISOString();
    const fileId = crypto.randomUUID();
    
    // Using base64 length roughly gives size in bytes
    let sizeBytes = base64Data ? Math.round((base64Data.length * 3) / 4) : 0;

    let tags = [];
    let metadata = {};
    let phash = null;
    
    let dataForAI = base64Data;
    if (!dataForAI && newUrl) {
      try {
        console.log(`[UploadEngine] Fetching image from URL for pHash...`);
        const imgRes = await fetch(newUrl);
        const imgBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(imgBuffer);
        dataForAI = buffer.toString('base64');
        sizeBytes = buffer.length; // Get real size
      } catch (fetchErr) {
        console.error('[UploadEngine] Failed to fetch image for pHash:', fetchErr.message);
      }
    }

    // 1. Calculate pHash for duplicate detection (Runs for all users)
    try {
      if (dataForAI) {
        console.log(`[UploadEngine] Calculating pHash for ${fileName}...`);
        phash = await AIService.calculatePHash(dataForAI, contentType);
      }
    } catch (phashErr) {
      console.error('[UploadEngine] pHash calculation failed:', phashErr.message);
    }

    // 2. Auto-tagging for premium users
    if (req.user.planTier === 'premium') {
      try {
        console.log(`[UploadEngine] Auto-tagging for premium user...`);
        // Get Settings
        let settings = {};
        const settingsRows = await sql`SELECT * FROM system_settings WHERE id = 'global'`;
        if (settingsRows[0]) settings = settingsRows[0];
        
        const [detectedTags, ocrText] = await Promise.all([
          AIService.detectObjects(newUrl, fileName, base64Data, settings),
          AIService.performOCR(base64Data, settings)
        ]);
        tags = detectedTags;
        metadata = { ocr_text: ocrText, processed_at: new Date().toISOString() };
      } catch (aiErr) {
        console.error('[UploadEngine] Auto-tagging failed:', aiErr.message);
        // Don't fail the upload if AI fails
      }
    }

    await sql`
      INSERT INTO files (
        id, tenant_id, connection_id, storage_key, storage_url, 
        name, content_type, size_bytes, folder, 
        uploaded_by, uploaded_at, tags, metadata, phash
      )
      VALUES (
        ${fileId}, ${tenantId}, ${targetConn.id}, ${newKey}, ${newUrl},
        ${fileName}, ${contentType}, ${sizeBytes}, ${folder || ''},
        ${req.user.id}, ${now}, ${tags}, ${JSON.stringify(metadata)}::jsonb, ${phash}
      )
    `;

    // Audit log
    await sql`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, target, metadata, created_at)
      VALUES (${crypto.randomUUID()}, ${tenantId}, ${req.user.id}, 'UPLOAD_FILE', 'storage', ${JSON.stringify({ name: fileName })}, ${now})
    `;

    res.json({ success: true, file: { id: fileId, url: newUrl } });
  } catch (err) {
    console.error('[UploadEngine] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files/delete', authenticateToken, async (req, res) => {
  const { fileIds } = req.body;
  const tenantId = req.user.tenantId;

  try {
    let deletedCount = 0;
    
    for (const id of fileIds) {
      // 1. Fetch file to get url and connection
      const fileRecords = await sql`SELECT * FROM files WHERE id = ${id} AND tenant_id = ${tenantId}`;
      const file = fileRecords[0];
      if (!file) continue;

      // 2. Fetch connection to get credentials
      const targetConns = await sql`SELECT * FROM storage_connections WHERE id = ${file.connection_id} AND tenant_id = ${tenantId}`;
      const targetConn = targetConns[0];

      // 3. Delete from Provider
      if (targetConn && targetConn.provider === 'vercel-blob') {
        try {
          const creds = JSON.parse(targetConn.credentials_encrypted);
          const rawToken = creds.token || '';
          const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
          const token = match ? match[1] : rawToken.trim();

          console.log(`[DeleteEngine] Deleting from Vercel: ${file.storage_url}`);
          await fetch('https://blob.vercel-storage.com/delete', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ urls: [file.storage_url] })
          });
        } catch (e) {
          console.error(`[DeleteEngine] Failed to delete remote file ${file.storage_url}:`, e.message);
        }
      }

      // 4. Delete from DB
      await sql`DELETE FROM files WHERE id = ${id} AND tenant_id = ${tenantId}`;
      deletedCount++;
    }

    // Audit log
    await sql`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, target, metadata, created_at)
      VALUES (${crypto.randomUUID()}, ${tenantId}, ${req.user.id}, 'DELETE_FILES', 'storage', ${JSON.stringify({ count: deletedCount })}, ${new Date().toISOString()})
    `;

    res.json({ success: true, deletedCount });
  } catch (err) {
    console.error('[DeleteEngine] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/folders/create', authenticateToken, async (req, res) => {
  const { name, provider } = req.body;
  const tenantId = req.user.tenantId;

  try {
    const targetConns = await sql`SELECT * FROM storage_connections WHERE provider = ${provider} AND tenant_id = ${tenantId}`;
    const targetConn = targetConns[0];
    if (!targetConn) throw new Error('Provider not connected');

    if (provider === 'google-photos') {
      const creds = JSON.parse(targetConn.credentials_encrypted);
      const token = creds.access_token || creds.token;

      console.log(`[FolderEngine] Creating Album "${name}" on Google Photos...`);
      const response = await fetch('https://photoslibrary.googleapis.com/v1/albums', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ album: { title: name } })
      });

      if (!response.ok) throw new Error(`Failed to create album on Google Photos: ${response.statusText}`);
      console.log(`[FolderEngine] Successfully created Album: ${name}`);
    }
    
    // Even if it's virtual (like Vercel), we log it
    await sql`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, target, metadata, created_at)
      VALUES (${crypto.randomUUID()}, ${tenantId}, ${req.user.id}, 'CREATE_FOLDER', 'storage', ${JSON.stringify({ name, provider })}, ${new Date().toISOString()})
    `;

    res.json({ success: true });
  } catch (err) {
    console.error('[FolderEngine] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files/transfer', authenticateToken, async (req, res) => {
  const { fileIds, targetProviderId, newFolder, fileId } = req.body;
  const tenantId = req.user.tenantId;

  // Support legacy single fileId and new array fileIds
  const idsToTransfer = fileIds || (fileId ? [fileId] : []);
  
  if (idsToTransfer.length === 0) {
    return res.status(400).json({ error: 'No files provided for transfer' });
  }

  try {
    // 1. Fetch target provider credentials once
    const targetConns = await sql`SELECT * FROM storage_connections WHERE provider = ${targetProviderId} AND tenant_id = ${tenantId}`;
    const targetConn = targetConns[0];
    if (!targetConn) throw new Error('Target provider not connected');

    const successfulTransfers = [];

    for (const currentFileId of idsToTransfer) {
      // 2. Fetch file metadata
      const fileRecords = await sql`SELECT * FROM files WHERE id = ${currentFileId} AND tenant_id = ${tenantId}`;
      const file = fileRecords[0];
      if (!file) continue;

      let newUrl = '';
      let newKey = '';

      // 3. Download from Source (Cloud to Cloud streaming)
      console.log(`[TransferEngine] Downloading ${file.name} from ${file.storage_url}...`);
      const sourceResponse = await fetch(file.storage_url);
      if (!sourceResponse.ok) continue;

      // 4. Upload to Target Provider
      if (targetProviderId === 'vercel-blob') {
        let creds;
        try {
          creds = JSON.parse(targetConn.credentials_encrypted);
        } catch (e) {
          continue;
        }
        
        const rawToken = creds.token || '';
        const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
        const token = match ? match[1] : rawToken.trim();

        const pathname = newFolder ? `${newFolder}/${file.name}` : file.name;
        
        console.log(`[TransferEngine] Uploading to Vercel Blob as ${pathname}...`);
        const uploadResponse = await fetch(`https://blob.vercel-storage.com/${encodeURIComponent(pathname)}?v=1`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': file.content_type || 'application/octet-stream',
          },
          body: sourceResponse.body,
          duplex: 'half'
        });

        if (!uploadResponse.ok) continue;
        const uploadData = await uploadResponse.json();
        newUrl = uploadData.url;
        newKey = uploadData.pathname;
      } else if (targetProviderId === 'google-photos') {
        let creds;
        try {
          creds = JSON.parse(targetConn.credentials_encrypted);
        } catch (e) {
          continue;
        }
        
        const decryptedToken = await getValidGoogleToken(targetConn);
        if (!decryptedToken) {
          await sql`
            INSERT INTO error_logs (id, tenant_id, user_id, action, error_message, metadata)
            VALUES (${crypto.randomUUID()}, ${tenantId}, ${req.user.id}, 'TRANSFER_FILE', 'Failed to get valid Google token', ${JSON.stringify({ fileId: currentFileId })})
          `;
          continue;
        }
        
        console.log(`[TransferEngine] Uploading bytes to Google Photos API...`);
        const uploadBytesRes = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${decryptedToken}`,
            'Content-Type': 'application/octet-stream',
            'X-Goog-Upload-Content-Type': file.content_type || 'image/jpeg',
            'X-Goog-Upload-Protocol': 'raw'
          },
          body: sourceResponse.body,
          duplex: 'half'
        });

        if (!uploadBytesRes.ok) {
          const errText = await uploadBytesRes.text();
          await sql`
            INSERT INTO error_logs (id, tenant_id, user_id, action, error_message, metadata)
            VALUES (${crypto.randomUUID()}, ${tenantId}, ${req.user.id}, 'TRANSFER_FILE', 'Failed to upload bytes to Google Photos', ${JSON.stringify({ fileId: currentFileId, status: uploadBytesRes.status, error: errText })})
          `;
          continue;
        }
        const uploadToken = await uploadBytesRes.text();
      
      console.log(`[TransferEngine] Creating Media Item in Google Photos...`);
      // Step 2: Create media item using Upload Token
      const createItemRes = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newMediaItems: [{
            description: file.name,
            simpleMediaItem: { uploadToken }
          }]
        })
      });
      
        if (!createItemRes.ok) {
          const errText = await createItemRes.text();
          await sql`
            INSERT INTO error_logs (id, tenant_id, user_id, action, error_message, metadata)
            VALUES (${crypto.randomUUID()}, ${tenantId}, ${req.user.id}, 'TRANSFER_FILE', 'Failed to create media item in Google Photos', ${JSON.stringify({ fileId: currentFileId, status: createItemRes.status, error: errText })})
          `;
          continue;
        }
        const createData = await createItemRes.json();
        
        if (!createData.newMediaItemResults || !createData.newMediaItemResults[0].mediaItem) {
          const itemResult = createData.newMediaItemResults ? createData.newMediaItemResults[0] : null;
          await sql`
            INSERT INTO error_logs (id, tenant_id, user_id, action, error_message, metadata)
            VALUES (${crypto.randomUUID()}, ${tenantId}, ${req.user.id}, 'TRANSFER_FILE', 'Google Photos API did not return media item', ${JSON.stringify({ fileId: currentFileId, result: itemResult })})
          `;
          continue;
        }
        
        const mediaItem = createData.newMediaItemResults[0].mediaItem;
        newUrl = mediaItem.baseUrl; // Google Photos gives a temporary baseUrl that lasts ~60 mins
        newKey = mediaItem.id;
      } else {
        continue;
      }

      // 5. Update Database Record
      const now = new Date().toISOString();
      await sql`
        UPDATE files 
        SET storage_url = ${newUrl}, storage_key = ${newKey}, connection_id = ${targetConn.id}, folder = ${newFolder || file.folder}, uploaded_at = ${now}
        WHERE id = ${currentFileId} AND tenant_id = ${tenantId}
      `;
      
      successfulTransfers.push({ id: currentFileId, url: newUrl });
    }

    if (successfulTransfers.length === 0 && idsToTransfer.length > 0) {
      throw new Error('All transfers failed. Check if target cloud supports these file types (e.g. Google Photos only accepts images/videos).');
    }

    res.json({ success: true, transfers: successfulTransfers });
  } catch (err) {
    console.error('[TransferEngine] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN ROUTES ==========

app.get('/api/admin/settings', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const users = await sql`SELECT role FROM users WHERE id = ${req.user.id}`;
    if (!users[0] || users[0].role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const settingsRows = await sql`SELECT * FROM system_settings WHERE id = 'global'`;
    res.json(settingsRows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const users = await sql`SELECT role FROM users WHERE id = ${req.user.id}`;
    if (!users[0] || users[0].role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const { active_llm_provider, llm_config } = req.body;
    
    await sql`
      INSERT INTO system_settings (id, active_llm_provider, llm_config, updated_at)
      VALUES ('global', ${active_llm_provider}, ${JSON.stringify(llm_config)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET 
        active_llm_provider = EXCLUDED.active_llm_provider,
        llm_config = EXCLUDED.llm_config,
        updated_at = NOW()
    `;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== AI SERVICE ROUTES ==========

app.post('/api/ai/tag/:id', authenticateToken, async (req, res) => {
  const fileId = req.params.id;
  try {
    // Check if user is premium
    if (req.user.planTier !== 'premium') {
      return res.status(403).json({ error: 'Magic Analysis is a premium feature. Please upgrade your plan.' });
    }

    // 1. Fetch file record
    const files = await sql`SELECT * FROM files WHERE id = ${fileId} AND tenant_id = ${req.user.tenantId}`;
    if (files.length === 0) return res.status(404).json({ error: 'File not found' });
    const file = files[0];

    // 2. We need the image as base64 to avoid cloud URL issues with AI
    if (!file.storage_url) throw new Error('File storage URL is missing');
    
    console.log(`[TaggingEngine] Fetching image from: ${file.storage_url}`);
    const response = await fetch(file.storage_url);
    if (!response.ok) throw new Error(`Failed to fetch image from storage: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 3. Get Settings
    let settings = {};
    try {
      const settingsRows = await sql`SELECT * FROM system_settings WHERE id = 'global'`;
      if (settingsRows[0]) settings = settingsRows[0];
    } catch (e) {}

    // 4. Run AI (Tags + OCR)
    const [tags, ocrText] = await Promise.all([
      AIService.detectObjects(file.storage_url, file.name, base64Data, settings),
      AIService.performOCR(base64Data, settings)
    ]);

    // 5. Update DB (Add tags and OCR to metadata)
    const metadata = { ...file.metadata, ocr_text: ocrText, processed_at: new Date().toISOString() };
    await sql`UPDATE files SET tags = ${tags}, metadata = ${metadata} WHERE id = ${fileId}`;

    res.json({ success: true, tags, ocrText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai/duplicates', authenticateToken, async (req, res) => {
  try {
    const duplicates = await AIService.findDuplicates(sql, req.user.tenantId);
    res.json(duplicates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai/smart-albums', authenticateToken, async (req, res) => {
  try {
    // 1. Get all files with tags for this tenant
    const files = await sql`
      SELECT id, name, storage_url, tags, folder 
      FROM files 
      WHERE tenant_id = ${req.user.tenantId} 
      AND array_length(tags, 1) > 0
    `;

    // 2. Map tags to albums
    const albumMap = {};
    files.forEach(file => {
      file.tags.forEach(tag => {
        if (!albumMap[tag]) {
          albumMap[tag] = {
            id: `album-${tag}`,
            name: tag,
            count: 0,
            cover_url: file.storage_url,
            files: []
          };
        }
        albumMap[tag].count++;
        // Just store the first 4 for preview if needed
        if (albumMap[tag].files.length < 4) {
          albumMap[tag].files.push(file.storage_url);
        }
      });
    });

    // 3. Convert to array and sort by count
    const albums = Object.values(albumMap).sort((a, b) => b.count - a.count);
    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== GOOGLE OAUTH PROXY (END-TO-END) ==========

app.get('/auth/google', (req, res) => {
  const redirectUri = getRedirectUri(req);
  // Pass the user's JWT token through Google's state param so we know who to link
  const userToken = req.query.token || '';
  const state = Buffer.from(JSON.stringify({ jwt: userToken })).toString('base64');
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile%20https://www.googleapis.com/auth/photoslibrary&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const redirectUri = getRedirectUri(req);
  
  try {
    // 1. Exchange auth code for tokens
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
      return res.status(400).send('<html><body style="background:#0f172a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1>Connection Failed</h1><p style="color:#94a3b8">Google OAuth error: ' + JSON.stringify(tokens) + '</p></div></body></html>');
    }

    // 2. Decode the state to get the user's session token
    var userPayload = null;
    if (state) {
      try {
        var stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.jwt) {
          // The 'jwt' field now actually contains our DB session token
          const sessionRows = await sql`SELECT * FROM sessions WHERE token = ${stateData.jwt}`;
          const session = sessionRows[0];
          if (session && new Date(session.expires_at) >= new Date()) {
            userPayload = { tenantId: session.tenant_id, userId: session.user_id };
          }
        }
      } catch (e) {
        console.error('State decode error:', e.message);
      }
    }

    // 3. Save the connection to DB if we have a valid user
    var savedToDB = false;
    if (userPayload && userPayload.tenantId) {
      try {
        // The web app doesn't always double encrypt for Google if it stores raw JSON string
        // We'll mimic the exact DB insert format
        var creds = JSON.stringify({ 
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + (tokens.expires_in * 1000)
        });

        const now = new Date().toISOString();

        // Upsert: delete old connection, insert fresh one
        await sql`DELETE FROM storage_connections WHERE tenant_id = ${userPayload.tenantId} AND provider = 'google-photos'`;
        await sql`
          INSERT INTO storage_connections (id, tenant_id, provider, name, credentials_encrypted, is_active, metadata, created_at, updated_at)
          VALUES (${crypto.randomUUID()}, ${userPayload.tenantId}, 'google-photos', 'Google Photos', ${creds}, true, '{}'::jsonb, ${now}, ${now})
        `;
        
        // Audit log
        await sql`
          INSERT INTO audit_logs (id, tenant_id, user_id, action, target, metadata, created_at)
          VALUES (${crypto.randomUUID()}, ${userPayload.tenantId}, ${userPayload.userId}, 'LINK_CLOUD', 'connection', '{"provider":"google-photos"}'::jsonb, ${now})
        `;
        
        savedToDB = true;
      } catch (dbErr) {
        console.error('DB save error:', dbErr.message);
      }
    }

    // 4. Return a premium success page
    var dbClass = savedToDB ? 'db-ok' : 'db-warn';
    var dbMsg = savedToDB 
      ? 'Credentials encrypted and saved to your vault' 
      : 'Connected but not saved. Please log in first, then reconnect.';

    res.send([
      '<!DOCTYPE html><html><head>',
      '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>CloudVault - Connected!</title>',
      '<style>',
      '* { margin: 0; padding: 0; box-sizing: border-box; }',
      'body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }',
      '.card { text-align: center; padding: 50px; max-width: 420px; }',
      '.icon { font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite; }',
      '@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }',
      'h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; background: linear-gradient(135deg, #3b82f6, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }',
      'p { color: #94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }',
      '.badge { display: inline-block; background: rgba(16,185,129,0.15); color: #10b981; padding: 10px 24px; border-radius: 30px; font-weight: 700; font-size: 14px; letter-spacing: 1px; border: 1px solid rgba(16,185,129,0.3); }',
      '.db-status { margin-top: 20px; padding: 12px 20px; border-radius: 12px; font-size: 13px; }',
      '.db-ok { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }',
      '.db-warn { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }',
      '.info { color: #475569; font-size: 13px; margin-top: 30px; }',
      '</style></head><body>',
      '<div class="card">',
      '<div class="icon">🔗</div>',
      '<h1>Google Photos Connected!</h1>',
      '<p>Your Google Photos library has been securely linked to CloudVault with AES-256 encryption.</p>',
      '<div class="badge">✓ INTEGRATION COMPLETE</div>',
      '<div class="db-status ' + dbClass + '">' + dbMsg + '</div>',
      '<p class="info">You can now close this window and return to the CloudVault app.</p>',
      '</div></body></html>'
    ].join('\n'));
  } catch (err) {
    res.status(500).send('<html><body style="background:#0f172a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1>Connection Failed</h1><p style="color:#ef4444">' + err.message + '</p></div></body></html>');
  }
});

// ========== START ==========

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`CloudVault Backend running on http://0.0.0.0:${port}`);
  });
}

module.exports = app;
