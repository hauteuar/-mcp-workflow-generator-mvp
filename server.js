// server.js - lowdb Backend Server with Jira Proxy (ES Modules)
import express from 'express';
import cors from 'cors';
import { JSONFilePreset } from 'lowdb/node';
import fetch from 'node-fetch'; // npm install node-fetch

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let db;

// Initialize lowdb
async function initializeDatabase() {
  try {
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

// Create or Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    await db.read();
    
    const index = db.data.projects.findIndex(p => p.id === projectId);
    
    if (index === -1) {
      db.data.projects.push(req.body);
      console.log(`✅ Created project: ${req.body.name} (ID: ${projectId})`);
    } else {
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

// JIRA PROXY ENDPOINTS

// Create Jira Issue
app.post('/api/jira/create-issue', async (req, res) => {
  try {
    const { jiraConfig, item } = req.body;
    
    if (!jiraConfig || !jiraConfig.url || !jiraConfig.email || !jiraConfig.apiToken) {
      return res.status(400).json({ error: 'Invalid Jira configuration' });
    }

    const auth = Buffer.from(`${jiraConfig.email}:${jiraConfig.apiToken}`).toString('base64');
    
    const requestBody = {
      fields: {
        project: { key: jiraConfig.defaultProject },
        summary: item.name,
        issuetype: { name: item.type },
        priority: { name: item.priority },
        duedate: item.duedate
      }
    };

    const response = await fetch(`${jiraConfig.url}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Jira API Error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.errorMessages?.join(', ') || 'Failed to create Jira issue' 
      });
    }

    const data = await response.json();
    console.log(`✅ Created Jira issue: ${data.key}`);
    res.json(data);
  } catch (err) {
    console.error('Error creating Jira issue:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import Issues from Jira
app.post('/api/jira/import-issues', async (req, res) => {
  try {
    const { jiraConfig } = req.body;
    
    if (!jiraConfig || !jiraConfig.url || !jiraConfig.email || !jiraConfig.apiToken) {
      return res.status(400).json({ error: 'Invalid Jira configuration' });
    }

    const auth = Buffer.from(`${jiraConfig.email}:${jiraConfig.apiToken}`).toString('base64');
    
    const jql = `project=${jiraConfig.defaultProject} ORDER BY created DESC`;
    const searchUrl = `${jiraConfig.url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100`;

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Jira API Error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.errorMessages?.join(', ') || 'Failed to fetch from Jira' 
      });
    }

    const data = await response.json();
    
    // Map Jira issues to our format
    const mapJiraStatus = (status) => {
      const s = status.toLowerCase();
      if (s.includes('done') || s.includes('closed') || s.includes('review')) return 'review';
      if (s.includes('progress') || s.includes('development')) return 'in-progress';
      return 'pending';
    };

    const mappedIssues = data.issues.map(issue => {
      const type = issue.fields.issuetype.name.toLowerCase();
      const itemType = type.includes('epic') ? 'epic' : 
                      type.includes('story') ? 'story' : 
                      type.includes('sub-task') || type.includes('subtask') ? 'subtask' : 'task';
      
      return {
        name: issue.fields.summary,
        type: itemType,
        level: itemType === 'epic' ? 1 : itemType === 'story' ? 2 : itemType === 'task' ? 3 : 4,
        status: mapJiraStatus(issue.fields.status.name),
        priority: (issue.fields.priority?.name || 'medium').toLowerCase(),
        assignee: issue.fields.assignee?.displayName || '',
        startDate: issue.fields.created ? new Date(issue.fields.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: issue.fields.duedate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimatedHours: issue.fields.timeoriginalestimate ? Math.round(issue.fields.timeoriginalestimate / 3600) : 0,
        actualHours: issue.fields.timespent ? Math.round(issue.fields.timespent / 3600) : 0,
        jira: {
          issueKey: issue.key,
          issueId: issue.id,
          issueUrl: `${jiraConfig.url}/browse/${issue.key}`,
          issueType: issue.fields.issuetype.name,
          lastSynced: new Date().toISOString(),
          syncStatus: 'synced'
        }
      };
    });

    console.log(`✅ Imported ${mappedIssues.length} issues from Jira project ${jiraConfig.defaultProject}`);
    res.json({ issues: mappedIssues });
  } catch (err) {
    console.error('Error importing from Jira:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║  🚀 Project Manager Server Started!           ║
║                                                ║
║  📊 Backend: http://localhost:${PORT}          ║
║  💾 Database: lowdb (db.json)                 ║
║  🔗 Jira Proxy: Enabled                       ║
║                                                ║
║  ✅ Ready for team collaboration!             ║
║  ✅ No CORS issues with Jira!                 ║
╚════════════════════════════════════════════════╝
    `);
  });
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  if (db) {
    await db.write();
  }
  process.exit(0);
});