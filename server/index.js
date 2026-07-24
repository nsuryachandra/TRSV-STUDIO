const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

console.log('--- TRSV Server Startup Diagnostics ---');
console.log('Process CWD:', process.cwd());
console.log('__dirname:', __dirname);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Enable CORS and JSON body parser
app.use(cors());

// Enable Cross-Origin Isolation headers to support WebAssembly multi-threading for background removal
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploaded files
app.use('/uploads', express.static(uploadDir));

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// API Routes

// Member Auth Routes
app.get('/api/auth/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || !username.trim()) {
      return res.json({ available: false, message: 'Username is required' });
    }
    const exists = await db.checkUsernameExists(username);
    if (exists) {
      return res.json({ available: false, message: 'Username is already taken' });
    }
    res.json({ available: true, message: 'Username is available' });
  } catch (err) {
    res.json({ available: false, message: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, role, username, password } = req.body;
    if (!name || !role || !username || !password) {
      return res.json({ success: false, error: 'All registration fields are required' });
    }
    const exists = await db.checkUsernameExists(username);
    if (exists) {
      return res.json({ success: false, error: 'Username is already taken. Please choose another username.' });
    }
    const member = await db.registerMember(name, role, username, password);
    res.status(201).json({ success: true, ...member });
  } catch (err) {
    res.json({ success: false, error: err.message || 'Username is already taken. Please choose another.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ success: false, error: 'Username and password are required' });
    }
    const member = await db.loginMember(username, password);
    
    // Log login event
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      await db.logEvent('login', member.name || username, ip, JSON.stringify({ role: member.role, username: member.username }));
    } catch (logErr) {
      console.warn('Failed to log login event:', logErr.message);
    }
    
    res.json({ success: true, ...member });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await db.allTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single template
app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await db.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new template
app.post('/api/templates', upload.single('poster'), async (req, res) => {
  try {
    const { title, config } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'Poster image file is required' });
    }
    
    // Convert template to Base64 to make it environment-independent (MySQL LONGTEXT database storage)
    const fileData = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype;
    const base64Data = fileData.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Data}`;
    
    // Cleanup local file immediately
    try {
      fs.unlinkSync(req.file.path);
    } catch (unlinkErr) {
      console.warn('Failed to delete temp template file:', unlinkErr.message);
    }

    const parsedConfig = JSON.parse(config || '{}');
    
    const newTemplate = await db.createTemplate(title || 'Untitled Poster', imageUrl, parsedConfig);
    res.status(201).json(newTemplate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
app.put('/api/templates/:id', async (req, res) => {
  try {
    const { title, config } = req.body;
    const updated = await db.updateTemplate(req.params.id, title, config);
    if (!updated) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template
app.delete('/api/templates/:id', async (req, res) => {
  try {
    const template = await db.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Attempt to delete image from disk, but do not block db deletion if it fails
    const filePath = path.join(__dirname, template.image_url);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.warn('Failed to delete template image file from disk:', fileErr.message);
      }
    }
    
    await db.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate template
app.post('/api/templates/:id/duplicate', async (req, res) => {
  try {
    const original = await db.getTemplate(req.params.id);
    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    let newImageUrl = '';
    if (original.image_url.startsWith('data:')) {
      newImageUrl = original.image_url;
    } else {
      const originalFilename = path.basename(original.image_url);
      const ext = path.extname(originalFilename);
      const newFilename = 'poster-copy-' + Date.now() + ext;
      
      const originalPath = path.join(uploadDir, originalFilename);
      const newPath = path.join(uploadDir, newFilename);
      
      if (fs.existsSync(originalPath)) {
        fs.copyFileSync(originalPath, newPath);
      } else {
        return res.status(400).json({ error: 'Original poster file not found on disk' });
      }
      newImageUrl = `/uploads/${newFilename}`;
    }
    
    const duplicated = await db.createTemplate(
      `${original.title} (Copy)`,
      newImageUrl,
      original.config
    );
    
    res.status(201).json(duplicated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics Logging API
app.post('/api/analytics/log', async (req, res) => {
  try {
    const { event_type, username, details } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    await db.logEvent(event_type || 'custom', username || 'Anonymous', ip, details || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/logs', async (req, res) => {
  try {
    const logs = await db.getAnalyticsLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/analytics/logs/clear', async (req, res) => {
  try {
    await db.clearAnalyticsLogs();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users Profile routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve React client build in production
const clientDistPath = path.join(__dirname, '../client/dist');
console.log('Target client/dist path:', clientDistPath);
const distExists = fs.existsSync(clientDistPath);
console.log('Does client/dist exist?:', distExists);

if (distExists) {
  app.use(express.static(clientDistPath));
  
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  console.log('Serving production React build from:', clientDistPath);
} else {
  console.error('CRITICAL: client/dist folder was not found! The server cannot serve the React frontend.');
  try {
    const parentDir = path.join(__dirname, '..');
    console.log('Files in parent directory:', fs.readdirSync(parentDir));
    const clientDir = path.join(__dirname, '../client');
    if (fs.existsSync(clientDir)) {
      console.log('Files in client directory:', fs.readdirSync(clientDir));
    }
  } catch (err) {
    console.error('Failed to list directories:', err.message);
  }
}

// Start listening
app.listen(PORT, () => {
  console.log(`TRSV Design Studio running on http://localhost:${PORT}`);
});
