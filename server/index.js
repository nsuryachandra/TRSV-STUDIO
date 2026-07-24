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

// Admin Authentication Middleware
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }
  const token = authHeader.substring(6);
  const credentials = Buffer.from(token, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  if (username === 'surya_dev' && password === 'surya') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized admin credentials' });
  }
};

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

// Supabase Client Initialization
const { createClient } = require('@supabase/supabase-js');
let supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_project_url') {
  try {
    // Sanitize URL: strip trailing slash and '/rest/v1' suffix if present
    supabaseUrl = supabaseUrl.trim().replace(/\/$/, '');
    if (supabaseUrl.endsWith('/rest/v1')) {
      supabaseUrl = supabaseUrl.substring(0, supabaseUrl.length - 8);
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized for template storage.');
    
    // Perform startup pre-flight check to verify if the 'templates' bucket is accessible
    supabase.storage.getBucket('templates')
      .then(({ data, error }) => {
        if (error) {
          console.warn('⚠️ Supabase Storage Pre-flight Warning: Bucket "templates" is not accessible or does not exist.', error.message);
          console.log('👉 Make sure you have created a public bucket named "templates" in your Supabase project dashboard.');
        } else {
          console.log('✅ Supabase Storage Pre-flight Success: Bucket "templates" is accessible and fully working!');
        }
      })
      .catch(err => {
        console.warn('⚠️ Supabase Storage Pre-flight Exception:', err.message);
      });
  } catch (supabaseErr) {
    console.warn('Failed to initialize Supabase client:', supabaseErr.message);
  }
} else {
  console.log('Using database base64 template image storage (Supabase not configured).');
}

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

// Update member profile
app.put('/api/auth/profile', async (req, res) => {
  try {
    const { username, name, role, photoDataUrl } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    let photoUrl = photoDataUrl || '';

    // If it's a base64 data URL, upload to Supabase if configured
    if (photoDataUrl && photoDataUrl.startsWith('data:') && supabase) {
      try {
        const match = photoDataUrl.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const fileData = Buffer.from(base64Data, 'base64');
          
          const fileExt = mimeType.split('/')[1] || 'png';
          // Sanitize username for filename
          const cleanUser = username.replace(/[^a-zA-Z0-9_-]/g, '');
          const fileName = `user-${cleanUser}-${Date.now()}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('templates')
            .upload(fileName, fileData, {
              contentType: mimeType,
              upsert: true
            });

          if (error) {
            throw error;
          }

          const { data: urlData } = supabase.storage
            .from('templates')
            .getPublicUrl(fileName);
          
          photoUrl = urlData.publicUrl;
          console.log('Successfully uploaded user profile photo to Supabase:', photoUrl);
        }
      } catch (supabaseErr) {
        console.warn('Supabase user photo upload failed, keeping base64:', supabaseErr.message);
      }
    }

    const updated = await db.updateUserProfile(username, name, role, photoUrl);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get member profile
app.get('/api/auth/profile', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const cleanUsername = username.trim().toLowerCase();
    
    let user = null;
    try {
      const users = await db.getUsers();
      user = users.find(u => u.username && u.username.toLowerCase() === cleanUsername);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      name: user.name,
      role: user.role,
      username: user.username,
      photoDataUrl: user.photo_url || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
app.post('/api/templates', upload.single('poster'), adminAuth, async (req, res) => {
  try {
    const { title, config } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'Poster image file is required' });
    }
    
    let imageUrl = '';
    const fileData = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype;

    if (supabase) {
      try {
        const fileExt = path.extname(req.file.originalname) || '.png';
        const fileName = `poster-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
        
        // Upload file buffer to Supabase templates storage bucket
        const { data, error } = await supabase.storage
          .from('templates')
          .upload(fileName, fileData, {
            contentType: mimeType,
            upsert: true
          });

        if (error) {
          throw error;
        }

        // Retrieve public URL from Supabase
        const { data: urlData } = supabase.storage
          .from('templates')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
        console.log('Successfully uploaded template to Supabase Storage:', imageUrl);
      } catch (supabaseErr) {
        console.warn('Supabase upload failed, falling back to Base64 storage:', supabaseErr.message);
        const base64Data = fileData.toString('base64');
        imageUrl = `data:${mimeType};base64,${base64Data}`;
      }
    } else {
      const base64Data = fileData.toString('base64');
      imageUrl = `data:${mimeType};base64,${base64Data}`;
    }
    
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
app.put('/api/templates/:id', adminAuth, async (req, res) => {
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
app.delete('/api/templates/:id', adminAuth, async (req, res) => {
  try {
    const template = await db.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Attempt to delete image from disk only if it is a local filesystem path
    if (template.image_url && !template.image_url.startsWith('data:') && !template.image_url.startsWith('http://') && !template.image_url.startsWith('https://')) {
      const originalFilename = path.basename(template.image_url);
      const filePath = path.join(uploadDir, originalFilename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) {
          console.warn('Failed to delete template image file from disk:', fileErr.message);
        }
      }
    }
    
    await db.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate template
app.post('/api/templates/:id/duplicate', adminAuth, async (req, res) => {
  try {
    const original = await db.getTemplate(req.params.id);
    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    let newImageUrl = '';
    if (original.image_url.startsWith('data:') || original.image_url.startsWith('http://') || original.image_url.startsWith('https://')) {
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

app.get('/api/analytics/logs', adminAuth, async (req, res) => {
  try {
    const logs = await db.getAnalyticsLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/analytics/logs/clear', adminAuth, async (req, res) => {
  try {
    await db.clearAnalyticsLogs();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users Profile routes
app.get('/api/users', adminAuth, async (req, res) => {
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
