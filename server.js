// server.js - SQLite Backend Server
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const dbPath = path.join(__dirname, 'project_manager.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        startDate TEXT,
        endDate TEXT,
        status TEXT,
        items TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Database initialized');
  });
}

app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects ORDER BY updatedAt DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const projects = rows.map(row => ({
      ...row,
      items: row.items ? JSON.parse(row.items) : []
    }));
    res.json(projects);
  });
});

app.post('/api/projects', (req, res) => {
  const { name, description, startDate, endDate, status, items } = req.body;
  const itemsJson = JSON.stringify(items || []);
  
  db.run(
    'INSERT INTO projects (name, description, startDate, endDate, status, items) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, startDate, endDate, status, itemsJson],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        id: this.lastID,
        name, description, startDate, endDate, status,
        items: items || []
      });
    }
  );
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, startDate, endDate, status, items } = req.body;
  const itemsJson = JSON.stringify(items || []);
  
  db.run(
    'UPDATE projects SET name = ?, description = ?, startDate = ?, endDate = ?, status = ?, items = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description, startDate, endDate, status, itemsJson, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server running', 
    database: 'SQLite'
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║  🚀 Project Manager Server Started!           ║
║                                                ║
║  📊 Backend: http://localhost:${PORT}          ║
║  💾 Database: SQLite (project_manager.db)     ║
║                                                ║
║  ✅ Ready for team collaboration!             ║
╚════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});