const express = require('express');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const axios = require('axios');
const Holidays = require('date-holidays');

const app = express();
const adapter = new FileSync('db.json');
const db = low(adapter);

// Initialize holidays
const hd = new Holidays('US'); // Can be configured for other countries

// Initialize database
db.defaults({ projects: [] }).write();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get holidays endpoint
app.get('/api/holidays/:year', (req, res) => {
  const year = parseInt(req.params.year);
  const holidays = hd.getHolidays(year);
  
  // Format holidays for frontend
  const formattedHolidays = holidays.map(holiday => ({
    date: holiday.date.split(' ')[0], // Get just the date part
    name: holiday.name,
    type: holiday.type
  }));
  
  res.json(formattedHolidays);
});

// Projects endpoints
app.get('/api/projects', (req, res) => {
  const projects = db.get('projects').value();
  res.json(projects);
});

app.put('/api/projects/:id', (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = req.body;
  
  const existingProject = db.get('projects')
    .find({ id: projectId })
    .value();
  
  if (existingProject) {
    db.get('projects')
      .find({ id: projectId })
      .assign(project)
      .write();
  } else {
    db.get('projects')
      .push(project)
      .write();
  }
  
  res.json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const projectId = parseInt(req.params.id);
  db.get('projects')
    .remove({ id: projectId })
    .write();
  res.json({ deleted: true });
});

// Jira Integration Endpoints

// Test connection and get projects
app.post('/api/jira/test-connection', async (req, res) => {
  const { url, email, apiToken } = req.body;
  
  try {
    const response = await axios.get(
      `${url}/rest/api/2/project`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return project keys and names
    const projects = response.data.map(project => ({
      key: project.key,
      name: project.name,
      id: project.id
    }));
    
    res.json({ 
      connected: true, 
      projects: projects 
    });
  } catch (error) {
    console.error('Jira connection error:', error.response?.data || error.message);
    res.status(400).json({ 
      connected: false, 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Create Jira issue
app.post('/api/jira/create-issue', async (req, res) => {
  const { jiraConfig, item } = req.body;
  
  try {
    const issueData = {
      fields: {
        project: {
          key: jiraConfig.defaultProject
        },
        summary: item.name,
        description: `Created from Project Manager Pro\n\nPriority: ${item.priority}\nDue Date: ${item.duedate}`,
        issuetype: {
          name: item.type
        },
        priority: {
          name: item.priority
        },
        duedate: item.duedate
      }
    };

    const response = await axios.post(
      `${jiraConfig.url}/rest/api/2/issue`,
      issueData,
      {
        headers: {
          'Authorization': `Bearer ${jiraConfig.apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      key: response.data.key,
      id: response.data.id,
      self: response.data.self
    });
  } catch (error) {
    console.error('Error creating Jira issue:', error.response?.data || error.message);
    res.status(400).json({ 
      error: error.response?.data?.errors || error.message 
    });
  }
});

// Import issues from Jira
app.post('/api/jira/import-issues', async (req, res) => {
  const { jiraConfig } = req.body;
  
  try {
    const jql = `project = ${jiraConfig.defaultProject} ORDER BY created DESC`;
    
    const response = await axios.get(
      `${jiraConfig.url}/rest/api/2/search`,
      {
        params: {
          jql: jql,
          maxResults: 100,
          fields: 'summary,status,priority,assignee,duedate,issuetype,parent,created,updated'
        },
        headers: {
          'Authorization': `Bearer ${jiraConfig.apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    const items = response.data.issues.map(issue => {
      const typeMap = {
        'Epic': 'epic',
        'Story': 'story',
        'Task': 'task',
        'Sub-task': 'subtask',
        'Bug': 'task'
      };

      const statusMap = {
        'To Do': 'pending',
        'In Progress': 'in-progress',
        'Done': 'review',
        'Closed': 'review'
      };

      return {
        id: Date.now() + Math.random(),
        name: issue.fields.summary,
        type: typeMap[issue.fields.issuetype.name] || 'task',
        status: statusMap[issue.fields.status.name] || 'pending',
        priority: issue.fields.priority?.name?.toLowerCase() || 'medium',
        assignee: issue.fields.assignee?.displayName || '',
        startDate: issue.fields.created?.split('T')[0] || new Date().toISOString().split('T')[0],
        endDate: issue.fields.duedate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        estimatedHours: 0,
        actualHours: 0,
        level: 1,
        parentId: null,
        children: [],
        comments: [],
        jira: {
          issueKey: issue.key,
          issueId: issue.id,
          issueUrl: `${jiraConfig.url}/browse/${issue.key}`,
          issueType: issue.fields.issuetype.name,
          lastSynced: new Date().toISOString()
        }
      };
    });

    res.json({ items });
  } catch (error) {
    console.error('Error importing from Jira:', error.response?.data || error.message);
    res.status(400).json({ 
      error: error.response?.data?.message || error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});