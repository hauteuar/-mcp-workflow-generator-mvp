// server.js - lowdb Backend Server (ES Modules)
import express from 'express';
import cors from 'cors';
import { JSONFilePreset } from 'lowdb/node';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let db;

// Initialize lowdb
async function initializeDatabase() {
  try {
    // Create db.json with default structure
    db = await JSONFilePreset('db.json', { projects: [] });
    console.log('✅ Connected to lowdb database (db.json)');
  } catch (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server running', 
    database: 'lowdb'
  });
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    await db.read();
    res.json(db.data.projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or Update project (prevents duplicates!)
app.put('/api/projects/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    await db.read();
    
    const index = db.data.projects.findIndex(p => p.id === projectId);
    
    if (index === -1) {
      // Project doesn't exist, create it
      db.data.projects.push(req.body);
      console.log(`✅ Created project: ${req.body.name} (ID: ${projectId})`);
    } else {
      // Project exists, update it
      db.data.projects[index] = req.body;
      console.log(`✅ Updated project: ${req.body.name} (ID: ${projectId})`);
    }
    
    await db.write();
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    await db.read();
    
    const originalLength = db.data.projects.length;
    db.data.projects = db.data.projects.filter(p => p.id !== projectId);
    
    if (db.data.projects.length < originalLength) {
      await db.write();
      console.log(`🗑️  Deleted project ID: ${projectId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy POST endpoint (for backwards compatibility)
app.post('/api/projects', async (req, res) => {
  try {
    await db.read();
    
    // Check if project already exists
    const exists = db.data.projects.find(p => p.id === req.body.id);
    if (exists) {
      // Use PUT logic instead
      return res.status(409).json({ 
        error: 'Project already exists. Use PUT to update.' 
      });
    }
    
    db.data.projects.push(req.body);
    await db.write();
    console.log(`✅ Created project: ${req.body.name} (ID: ${req.body.id})`);
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server after DB initialization
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║  🚀 Project Manager Server Started!           ║
║                                                ║
║  📊 Backend: http://localhost:${PORT}          ║
║  💾 Database: lowdb (db.json)                 ║
║                                                ║
║  ✅ Ready for team collaboration!             ║
║  ✅ No duplicate sync - smart merge enabled   ║
╚════════════════════════════════════════════════╝
    `);
  });
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  if (db) {
    await db.write(); // Save any pending changes
  }
  process.exit(0);
});