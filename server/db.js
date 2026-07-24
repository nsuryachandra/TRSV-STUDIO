const fs = require('fs');
const path = require('path');

// Manually load .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    });
    console.log('Loaded local .env configuration');
  } catch (e) {
    console.warn('Failed to parse .env file:', e.message);
  }
}

let db = null;
let mysqlPool = null;
let useMysql = false;
let useFallback = false;
const fallbackFilePath = path.join(__dirname, 'db_fallback.json');

// Initialize JSON fallback database if both MySQL and SQLite fail
const initFallbackDb = () => {
  if (!fs.existsSync(fallbackFilePath)) {
    const defaultConfig = {
      photo: { x: 35, y: 930, width: 260, height: 400, radius: 0, circle: false, autoCrop: true, faceCenter: true, removeBg: true, blendMode: 'normal', shadow: true, shadowBlur: 18, shadowOpacity: 0.18, shadowDistance: 4, edgeFeather: 28, scale: 1.0, rotation: 0, anchorSide: 'left', rimLightColor: '#FFD700', rimLightOpacity: 0.10, rimLightThickness: 3, fadeDistance: 80 },
      name: { x: 140, y: 780, width: 800, height: 80, font: 'Bebas Neue', size: 64, weight: '700', spacing: 2, uppercase: true, align: 'center', color: '#FFFFFF', shadow: true, shadowBlur: 6, shadowOpacity: 0.25, autoResize: true, minSize: 42, maxSize: 70, maxLines: 1 },
      role: { x: 190, y: 880, width: 700, height: 45, font: 'Poppins', size: 28, weight: '600', spacing: 1, uppercase: false, align: 'center', color: '#222222', autoResize: true, minSize: 22, maxSize: 34, maxLines: 1 }
    };
    const initialData = {
      templates: [
        {
          id: 1,
          title: 'TRSV State Campaign Poster',
          image_url: '/uploads/campaign_poster.png',
          config: defaultConfig,
          created_at: new Date().toISOString()
        }
      ],
      users: []
    };
    fs.writeFileSync(fallbackFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log('Seeded default template in JSON fallback db');
  }
  console.log('Using JSON file database fallback at:', fallbackFilePath);
};

const getFallbackData = () => {
  try {
    const data = fs.readFileSync(fallbackFilePath, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.users) parsed.users = [];
    return parsed;
  } catch (error) {
    return { templates: [], users: [] };
  }
};

const saveFallbackData = (data) => {
  fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf-8');
};

// Check for MySQL credentials or URL
const mysqlUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

if (mysqlUrl) {
  try {
    const mysql = require('mysql2/promise');
    // Strip ssl-mode query param from URL — mysql2 handles SSL via config, not URL params
    let cleanMysqlUrl = mysqlUrl;
    try {
      const urlObj = new URL(mysqlUrl);
      urlObj.searchParams.delete('ssl-mode');
      cleanMysqlUrl = urlObj.toString();
    } catch (e) {
      // If URL parsing fails, use as-is
    }
    mysqlPool = mysql.createPool({
      uri: cleanMysqlUrl,
      ssl: {
        rejectUnauthorized: false
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    useMysql = true;
    console.log('Connecting to MySQL database (Aiven/Cloud)...');
    initMysqlTables();
  } catch (error) {
    console.error('Failed to load mysql2 module or connect to MySQL. Falling back to SQLite3.', error.message);
    initSqliteDb();
  }
} else {
  initSqliteDb();
}

async function initMysqlTables() {
  try {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          image_url VARCHAR(255) NOT NULL,
          config TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          photo_url VARCHAR(255) DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed default template if tables are empty
      const [rows] = await connection.query('SELECT COUNT(*) as count FROM templates');
      if (rows && rows[0] && rows[0].count === 0) {
        const defaultConfig = {
          photo: { x: 35, y: 930, width: 260, height: 400, radius: 0, circle: false, autoCrop: true, faceCenter: true, removeBg: true, blendMode: 'normal', shadow: true, shadowBlur: 18, shadowOpacity: 0.18, shadowDistance: 4, edgeFeather: 28, scale: 1.0, rotation: 0, anchorSide: 'left', rimLightColor: '#FFD700', rimLightOpacity: 0.10, rimLightThickness: 3, fadeDistance: 80 },
          name: { x: 140, y: 780, width: 800, height: 80, font: 'Bebas Neue', size: 64, weight: '700', spacing: 2, uppercase: true, align: 'center', color: '#FFFFFF', shadow: true, shadowBlur: 6, shadowOpacity: 0.25, autoResize: true, minSize: 42, maxSize: 70, maxLines: 1 },
          role: { x: 190, y: 880, width: 700, height: 45, font: 'Poppins', size: 28, weight: '600', spacing: 1, uppercase: false, align: 'center', color: '#222222', autoResize: true, minSize: 22, maxSize: 34, maxLines: 1 }
        };
        await connection.query(
          'INSERT INTO templates (title, image_url, config) VALUES (?, ?, ?)',
          ['TRSV State Campaign Poster', '/uploads/campaign_poster.png', JSON.stringify(defaultConfig)]
        );
        console.log('Seeded default template in MySQL database');
      }
      console.log('Successfully connected and initialized MySQL database tables.');
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Failed to initialize MySQL tables. Falling back to SQLite3.', err.message);
    useMysql = false;
    if (mysqlPool) {
      mysqlPool.end().catch(() => {});
    }
    initSqliteDb();
  }
}

function initSqliteDb() {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'posterforge.db');
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open SQLite database, falling back to JSON file:', err.message);
        useFallback = true;
        initFallbackDb();
      } else {
        console.log('Connected to SQLite database at:', dbPath);
        createSqliteTables();
      }
    });
  } catch (error) {
    console.warn('sqlite3 package could not be loaded. Falling back to JSON file database.');
    useFallback = true;
    initFallbackDb();
  }
}

function createSqliteTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      db.get('SELECT COUNT(*) as count FROM templates', [], (err, row) => {
        if (!err && row && row.count === 0) {
          const defaultConfig = {
            photo: { x: 35, y: 930, width: 260, height: 400, radius: 0, circle: false, autoCrop: true, faceCenter: true, removeBg: true, blendMode: 'normal', shadow: true, shadowBlur: 18, shadowOpacity: 0.18, shadowDistance: 4, edgeFeather: 28, scale: 1.0, rotation: 0, anchorSide: 'left', rimLightColor: '#FFD700', rimLightOpacity: 0.10, rimLightThickness: 3, fadeDistance: 80 },
            name: { x: 140, y: 780, width: 800, height: 80, font: 'Bebas Neue', size: 64, weight: '700', spacing: 2, uppercase: true, align: 'center', color: '#FFFFFF', shadow: true, shadowBlur: 6, shadowOpacity: 0.25, autoResize: true, minSize: 42, maxSize: 70, maxLines: 1 },
            role: { x: 190, y: 880, width: 700, height: 45, font: 'Poppins', size: 28, weight: '600', spacing: 1, uppercase: false, align: 'center', color: '#222222', autoResize: true, minSize: 22, maxSize: 34, maxLines: 1 }
          };
          db.run(
            'INSERT INTO templates (title, image_url, config) VALUES (?, ?, ?)',
            ['TRSV State Campaign Poster', '/uploads/campaign_poster.png', JSON.stringify(defaultConfig)]
          );
        }
      });
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        username TEXT UNIQUE,
        password TEXT,
        photo_url TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

// Database wrapper API
const dbAPI = {
  allTemplates: () => {
    return new Promise(async (resolve, reject) => {
      if (useMysql) {
        try {
          const [rows] = await mysqlPool.query('SELECT * FROM templates ORDER BY id DESC');
          const parsed = rows.map(row => ({
            ...row,
            config: JSON.parse(row.config)
          }));
          return resolve(parsed);
        } catch (err) {
          return reject(err);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        return resolve(data.templates);
      }
      db.all('SELECT * FROM templates ORDER BY id DESC', [], (err, rows) => {
        if (err) return reject(err);
        const parsed = rows.map(row => ({
          ...row,
          config: JSON.parse(row.config)
        }));
        resolve(parsed);
      });
    });
  },

  getTemplate: (id) => {
    return new Promise(async (resolve, reject) => {
      if (useMysql) {
        try {
          const [rows] = await mysqlPool.query('SELECT * FROM templates WHERE id = ?', [id]);
          if (!rows || rows.length === 0) return resolve(null);
          const row = rows[0];
          return resolve({
            ...row,
            config: JSON.parse(row.config)
          });
        } catch (err) {
          return reject(err);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        const template = data.templates.find(t => t.id === parseInt(id));
        return resolve(template || null);
      }
      db.get('SELECT * FROM templates WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        resolve({
          ...row,
          config: JSON.parse(row.config)
        });
      });
    });
  },

  createTemplate: (title, imageUrl, config) => {
    return new Promise(async (resolve, reject) => {
      const configStr = JSON.stringify(config);
      if (useMysql) {
        try {
          const [result] = await mysqlPool.query(
            'INSERT INTO templates (title, image_url, config) VALUES (?, ?, ?)',
            [title, imageUrl, configStr]
          );
          return resolve({ id: result.insertId, title, image_url: imageUrl, config });
        } catch (err) {
          return reject(err);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        const newId = data.templates.length > 0 ? Math.max(...data.templates.map(t => t.id)) + 1 : 1;
        const newTemplate = {
          id: newId,
          title,
          image_url: imageUrl,
          config,
          created_at: new Date().toISOString()
        };
        data.templates.push(newTemplate);
        saveFallbackData(data);
        return resolve(newTemplate);
      }
      db.run(
        'INSERT INTO templates (title, image_url, config) VALUES (?, ?, ?)',
        [title, imageUrl, configStr],
        function(err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, title, image_url: imageUrl, config });
        }
      );
    });
  },

  deleteTemplate: (id) => {
    return new Promise(async (resolve, reject) => {
      if (useMysql) {
        try {
          await mysqlPool.query('DELETE FROM templates WHERE id = ?', [id]);
          return resolve(true);
        } catch (err) {
          return reject(err);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        data.templates = data.templates.filter(t => t.id !== parseInt(id));
        saveFallbackData(data);
        return resolve(true);
      }
      db.run('DELETE FROM templates WHERE id = ?', [id], function(err) {
        if (err) return reject(err);
        resolve(true);
      });
    });
  },

  updateTemplate: (id, title, config) => {
    return new Promise(async (resolve, reject) => {
      const configStr = JSON.stringify(config);
      if (useMysql) {
        try {
          await mysqlPool.query(
            'UPDATE templates SET title = ?, config = ? WHERE id = ?',
            [title, configStr, id]
          );
          return resolve({ id, title, config });
        } catch (err) {
          return reject(err);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        const idx = data.templates.findIndex(t => t.id === parseInt(id));
        if (idx !== -1) {
          data.templates[idx] = {
            ...data.templates[idx],
            title,
            config
          };
          saveFallbackData(data);
          return resolve(data.templates[idx]);
        }
        return resolve(null);
      }
      db.run(
        'UPDATE templates SET title = ?, config = ? WHERE id = ?',
        [title, configStr, id],
        function(err) {
          if (err) return reject(err);
          resolve({ id, title, config });
        }
      );
    });
  },

  // Member Authentication API
  getUsers: () => {
    return new Promise(async (resolve, reject) => {
      if (useMysql) {
        try {
          const [rows] = await mysqlPool.query('SELECT id, name, role, username, photo_url, created_at FROM users ORDER BY id DESC');
          return resolve(rows);
        } catch (err) {
          return reject(err);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        return resolve(data.users);
      }
      db.all('SELECT id, name, role, username, photo_url, created_at FROM users ORDER BY id DESC', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  checkUsernameExists: (username) => {
    return new Promise(async (resolve) => {
      const cleanUsername = username.trim().toLowerCase();
      if (useMysql) {
        try {
          const [rows] = await mysqlPool.query('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
          return resolve(rows && rows.length > 0);
        } catch {
          return resolve(false);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        const found = data.users.some(u => u.username && u.username.toLowerCase() === cleanUsername);
        return resolve(found);
      }
      db.get('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername], (err, row) => {
        if (err || !row) return resolve(false);
        resolve(true);
      });
    });
  },

  registerMember: (name, role, username, password) => {
    return new Promise(async (resolve, reject) => {
      const cleanUsername = username.trim().toLowerCase();
      if (useMysql) {
        try {
          const [result] = await mysqlPool.query(
            'INSERT INTO users (name, role, username, password, photo_url) VALUES (?, ?, ?, ?, ?)',
            [name, role, cleanUsername, password, '']
          );
          return resolve({ id: result.insertId, name, role, username: cleanUsername });
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY' || err.message.includes('duplicate') || err.message.includes('UNIQUE')) {
            return reject(new Error('Username is already taken. Please choose another username.'));
          }
          return reject(err);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        const existing = data.users.find(u => u.username && u.username.toLowerCase() === cleanUsername);
        if (existing) {
          return reject(new Error('Username is already taken. Please choose another username.'));
        }
        const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
        const newUser = {
          id: newId,
          name,
          role,
          username: cleanUsername,
          password,
          photo_url: '',
          created_at: new Date().toISOString()
        };
        data.users.push(newUser);
        saveFallbackData(data);
        return resolve(newUser);
      }
      db.run(
        'INSERT INTO users (name, role, username, password, photo_url) VALUES (?, ?, ?, ?, ?)',
        [name, role, cleanUsername, password, ''],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              return reject(new Error('Username is already taken. Please choose another username.'));
            }
            return reject(err);
          }
          resolve({ id: this.lastID, name, role, username: cleanUsername });
        }
      );
    });
  },

  loginMember: (username, password) => {
    return new Promise(async (resolve, reject) => {
      const cleanUsername = username.trim().toLowerCase();
      if (useMysql) {
        try {
          const [rows] = await mysqlPool.query(
            'SELECT id, name, role, username, photo_url FROM users WHERE LOWER(username) = ? AND password = ?',
            [cleanUsername, password]
          );
          if (!rows || rows.length === 0) {
            return reject(new Error('Invalid username or password.'));
          }
          return resolve(rows[0]);
        } catch (err) {
          return reject(err);
        }
      }
      if (useFallback) {
        const data = getFallbackData();
        const user = data.users.find(u => u.username && u.username.toLowerCase() === cleanUsername && u.password === password);
        if (!user) {
          return reject(new Error('Invalid username or password.'));
        }
        return resolve(user);
      }
      db.get(
        'SELECT id, name, role, username, photo_url FROM users WHERE LOWER(username) = ? AND password = ?',
        [cleanUsername, password],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return reject(new Error('Invalid username or password.'));
          resolve(row);
        }
      );
    });
  }
};

module.exports = dbAPI;
