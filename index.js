import React, { useState, useEffect } from 'react';
import { Plus, Calendar, BarChart3, Trash2, Upload, Settings, Link2, ExternalLink, MessageSquare, RefreshCw, CheckCheck, ChevronRight, ChevronDown, Download, TrendingUp, PieChart, Wifi, WifiOff } from 'lucide-react';

const ProjectManager = () => {
  // Backend Configuration
  const [backendConnected, setBackendConnected] = useState(false);
  const [useBackend, setUseBackend] = useState(false);
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001/api');
  const [showBackendSettings, setShowBackendSettings] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Core State
  const [projects, setProjects] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set([101, 102, 201]));
  
  // Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showJiraSettingsModal, setShowJiraSettingsModal] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  
  // Selected Items
  const [selectedItem, setSelectedItem] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  
  // Filters
  const [timelineFilters, setTimelineFilters] = useState({
    showEpics: true,
    showStories: true,
    showTasks: true,
    showSubtasks: false
  });
  
  // Jira Configuration
  const [jiraConfig, setJiraConfig] = useState({
    url: '',
    email: '',
    apiToken: '',
    defaultProject: '',
    autoSync: false,
    connected: false
  });

  // Form States
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'planning'
  });

  const [newItem, setNewItem] = useState({
    name: '',
    type: 'task',
    parentId: null,
    status: 'pending',
    priority: 'medium',
    startDate: '',
    endDate: '',
    assignee: '',
    estimatedHours: 0,
    createInJira: false
  });

  const [newComment, setNewComment] = useState('');
  const [postToJira, setPostToJira] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    loadInitialData();
    const savedUseBackend = localStorage.getItem('useBackend') === 'true';
    const savedBackendUrl = localStorage.getItem('backendUrl');
    
    if (savedBackendUrl) setBackendUrl(savedBackendUrl);
    if (savedUseBackend) {
      setUseBackend(true);
      checkBackendConnection(savedBackendUrl);
    }
  }, []);

  // Auto-sync with backend
  useEffect(() => {
    if (useBackend && backendConnected) {
      const interval = setInterval(() => {
        syncFromBackend();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [useBackend, backendConnected]);

  // Save to localStorage
  useEffect(() => {
    if (!useBackend) {
      localStorage.setItem('projectManagerData', JSON.stringify(projects));
    }
  }, [projects, useBackend]);

  useEffect(() => {
    localStorage.setItem('jiraConfig', JSON.stringify(jiraConfig));
  }, [jiraConfig]);

  // Load initial data
  const loadInitialData = () => {
    try {
      const saved = localStorage.getItem('projectManagerData');
      const savedJira = localStorage.getItem('jiraConfig');
      
      if (saved) {
        setProjects(JSON.parse(saved));
      } else {
        setProjects(getDefaultProjects());
      }
      
      if (savedJira) {
        setJiraConfig(JSON.parse(savedJira));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setProjects(getDefaultProjects());
    }
  };

  // Default sample data
  const getDefaultProjects = () => [
    {
      id: 1,
      name: 'Website Redesign',
      description: 'Complete overhaul of company website',
      startDate: '2025-10-01',
      endDate: '2025-12-31',
      status: 'in-progress',
      items: [
        { 
          id: 101, 
          name: 'User Authentication System',
          type: 'epic',
          level: 1,
          parentId: null,
          children: [102, 104],
          status: 'in-progress', 
          priority: 'high', 
          startDate: '2025-10-01', 
          endDate: '2025-11-15', 
          assignee: 'Team Lead',
          estimatedHours: 160,
          actualHours: 95,
          comments: [],
          jira: null
        },
        { 
          id: 102, 
          name: 'Login Page',
          type: 'story',
          level: 2,
          parentId: 101,
          children: [103],
          status: 'in-progress', 
          priority: 'high', 
          startDate: '2025-10-01', 
          endDate: '2025-10-20', 
          assignee: 'John',
          estimatedHours: 40,
          actualHours: 25,
          comments: [],
          jira: null
        },
        { 
          id: 103, 
          name: 'Design Login UI',
          type: 'task',
          level: 3,
          parentId: 102,
          children: [],
          status: 'review', 
          priority: 'high', 
          startDate: '2025-10-01', 
          endDate: '2025-10-10', 
          assignee: 'Sarah',
          estimatedHours: 16,
          actualHours: 16,
          comments: [],
          jira: null
        },
        { 
          id: 104, 
          name: 'Password Reset Flow',
          type: 'story',
          level: 2,
          parentId: 101,
          children: [105],
          status: 'pending', 
          priority: 'medium', 
          startDate: '2025-10-21', 
          endDate: '2025-11-15', 
          assignee: 'Mike',
          estimatedHours: 60,
          actualHours: 0,
          comments: [],
          jira: null
        },
        { 
          id: 105, 
          name: 'Email Service Integration',
          type: 'task',
          level: 3,
          parentId: 104,
          children: [],
          status: 'pending', 
          priority: 'medium', 
          startDate: '2025-10-25', 
          endDate: '2025-11-05', 
          assignee: 'Alice',
          estimatedHours: 24,
          actualHours: 0,
          comments: [],
          jira: null
        }
      ]
    }
  ];

  // Backend Functions
  const checkBackendConnection = async (url = backendUrl) => {
    try {
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        setBackendConnected(true);
        return true;
      }
    } catch (error) {
      setBackendConnected(false);
    }
    return false;
  };

  const enableBackend = async () => {
    const connected = await checkBackendConnection(backendUrl);
    if (connected) {
      setUseBackend(true);
      localStorage.setItem('backendUrl', backendUrl);
      localStorage.setItem('useBackend', 'true');
      await syncFromBackend();
      setShowBackendSettings(false);
      alert('✅ Connected to backend server!');
    } else {
      alert('❌ Cannot connect to backend server. Make sure it is running.');
    }
  };

  const disableBackend = () => {
    setUseBackend(false);
    localStorage.setItem('useBackend', 'false');
    alert('Backend sync disabled. Using local storage only.');
  };

  const syncFromBackend = async () => {
    if (!useBackend || !backendConnected) return;
    
    try {
      const response = await fetch(`${backendUrl}/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        setLastSyncTime(new Date().toISOString());
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const saveProjectToBackend = async (project) => {
    if (!useBackend) return;
    
    try {
      const method = project.id < 1000000000 ? 'PUT' : 'POST';
      const url = method === 'POST' 
        ? `${backendUrl}/projects` 
        : `${backendUrl}/projects/${project.id}`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error saving to backend:', error);
    }
  };

  // Utility Functions
  const getItemIcon = (type) => {
    const icons = { epic: '📦', story: '📖', task: '✓', subtask: '○' };
    return icons[type] || '•';
  };

  const getLevelColor = (level) => {
    const colors = {
      1: 'bg-purple-100 text-purple-700 border-purple-300',
      2: 'bg-blue-100 text-blue-700 border-blue-300',
      3: 'bg-green-100 text-green-700 border-green-300',
      4: 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return colors[level] || colors[4];
  };

  const toggleExpand = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const calculateProgress = (items, itemId) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    
    if (item.children.length === 0) {
      return item.status === 'review' ? 100 : item.status === 'in-progress' ? 50 : 0;
    }
    
    const childProgress = item.children.map(childId => calculateProgress(items, childId));
    return childProgress.reduce((sum, p) => sum + p, 0) / childProgress.length;
  };

  const calculateRollupHours = (items, itemId) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return { estimated: 0, actual: 0 };
    
    if (item.children.length === 0) {
      return { estimated: item.estimatedHours, actual: item.actualHours };
    }
    
    const childHours = item.children.map(childId => calculateRollupHours(items, childId));
    return {
      estimated: childHours.reduce((sum, h) => sum + h.estimated, 0),
      actual: childHours.reduce((sum, h) => sum + h.actual, 0)
    };
  };

  // CRUD Operations
  const addProject = async () => {
    if (newProject.name && newProject.startDate && newProject.endDate) {
      const projectToAdd = {
        ...newProject,
        id: Date.now(),
        items: []
      };
      
      if (useBackend) {
        const saved = await saveProjectToBackend(projectToAdd);
        if (saved) {
          setProjects([...projects, saved]);
        }
      } else {
        setProjects([...projects, projectToAdd]);
      }
      
      setNewProject({ name: '', description: '', startDate: '', endDate: '', status: 'planning' });
      setShowProjectModal(false);
    }
  };

  const addItem = async () => {
    if (selectedProject && newItem.name && newItem.startDate && newItem.endDate) {
      const level = newItem.parentId ? 
        (selectedProject.items.find(i => i.id === newItem.parentId)?.level || 0) + 1 : 1;
      
      const itemToAdd = { 
        ...newItem, 
        id: Date.now(),
        level,
        children: [],
        comments: [],
        actualHours: 0,
        jira: null
      };

      if (newItem.createInJira && jiraConfig.connected) {
        const jiraIssue = await createJiraIssue(itemToAdd);
        if (jiraIssue) {
          itemToAdd.jira = jiraIssue;
        }
      }

      const updatedProjects = projects.map(p => {
        if (p.id === selectedProject.id) {
          const updatedItems = [...p.items, itemToAdd];
          
          if (newItem.parentId) {
            return {
              ...p,
              items: updatedItems.map(item => 
                item.id === newItem.parentId 
                  ? { ...item, children: [...item.children, itemToAdd.id] }
                  : item
              )
            };
          }
          
          return { ...p, items: updatedItems };
        }
        return p;
      });
      
      setProjects(updatedProjects);
      
      if (useBackend) {
        const updated = updatedProjects.find(p => p.id === selectedProject.id);
        await saveProjectToBackend(updated);
      }
      
      setNewItem({ name: '', type: 'task', parentId: null, status: 'pending', priority: 'medium', startDate: '', endDate: '', assignee: '', estimatedHours: 0, createInJira: false });
      setShowItemModal(false);
    }
  };

  const updateItemStatus = async (projectId, itemId, newStatus) => {
    const updatedProjects = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          items: p.items.map(item => 
            item.id === itemId ? { ...item, status: newStatus } : item
          )
        };
      }
      return p;
    });
    
    setProjects(updatedProjects);
    
    if (useBackend) {
      const updated = updatedProjects.find(p => p.id === projectId);
      await saveProjectToBackend(updated);
    }
  };

  const deleteItem = async (projectId, itemId) => {
    const updatedProjects = projects.map(p => {
      if (p.id === projectId) {
        const itemsToDelete = new Set([itemId]);
        
        const collectChildren = (id) => {
          const item = p.items.find(i => i.id === id);
          if (item?.children) {
            item.children.forEach(childId => {
              itemsToDelete.add(childId);
              collectChildren(childId);
            });
          }
        };
        collectChildren(itemId);
        
        return {
          ...p,
          items: p.items
            .filter(item => !itemsToDelete.has(item.id))
            .map(item => ({
              ...item,
              children: item.children ? item.children.filter(cid => !itemsToDelete.has(cid)) : []
            }))
        };
      }
      return p;
    });
    
    setProjects(updatedProjects);
    
    if (useBackend) {
      const updated = updatedProjects.find(p => p.id === projectId);
      await saveProjectToBackend(updated);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedItem) return;

    const comment = {
      id: Date.now(),
      text: newComment,
      author: 'Current User',
      timestamp: new Date().toISOString(),
      postedToJira: postToJira && selectedItem.jira
    };

    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          items: p.items.map(item => 
            item.id === selectedItem.id
              ? { ...item, comments: [...(item.comments || []), comment] }
              : item
          )
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    setNewComment('');
    setPostToJira(false);
    
    const updatedItem = updatedProjects
      .find(p => p.id === selectedProject.id)
      ?.items.find(i => i.id === selectedItem.id);
    if (updatedItem) setSelectedItem(updatedItem);
  };

  // Jira Functions
  const createJiraIssue = async (item) => {
    if (!jiraConfig.connected) return null;
    
    try {
      const auth = btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`);
      const jiraTypeMap = { epic: 'Epic', story: 'Story', task: 'Task', subtask: 'Sub-task' };
      
      const requestBody = {
        fields: {
          project: { key: jiraConfig.defaultProject },
          summary: item.name,
          issuetype: { name: jiraTypeMap[item.type] || 'Task' },
          priority: { name: item.priority === 'high' ? 'High' : item.priority === 'medium' ? 'Medium' : 'Low' },
          duedate: item.endDate
        }
      };

      const response = await fetch(`${jiraConfig.url}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to create Jira issue: ${errorData.errorMessages?.join(', ')}`);
        return null;
      }

      const data = await response.json();
      alert(`✅ Created Jira ${item.type}: ${data.key}`);
      
      return {
        issueKey: data.key,
        issueId: data.id,
        issueUrl: `${jiraConfig.url}/browse/${data.key}`,
        issueType: jiraTypeMap[item.type],
        lastSynced: new Date().toISOString()
      };
    } catch (error) {
      alert(`Error: ${error.message}`);
      return null;
    }
  };

  const connectToJira = () => {
    if (jiraConfig.url && jiraConfig.email && jiraConfig.apiToken && jiraConfig.defaultProject) {
      setJiraConfig({ ...jiraConfig, connected: true });
      alert('Successfully connected to Jira!');
      setShowJiraSettingsModal(false);
    } else {
      alert('Please fill in all fields');
    }
  };

  const disconnectJira = () => {
    setJiraConfig({
      url: '', email: '', apiToken: '', defaultProject: '', autoSync: false, connected: false
    });
    alert('Disconnected from Jira');
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ projects, jiraConfig, exportDate: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getItemStats = () => {
    if (!selectedProject) return { epics: 0, stories: 0, tasks: 0, subtasks: 0, review: 0, inProgress: 0, pending: 0, total: 0 };
    
    let epics = 0, stories = 0, tasks = 0, subtasks = 0;
    let review = 0, inProgress = 0, pending = 0;
    
    selectedProject.items.forEach(item => {
      if (item.type === 'epic') epics++;
      else if (item.type === 'story') stories++;
      else if (item.type === 'task') tasks++;
      else if (item.type === 'subtask') subtasks++;
      
      if (item.status === 'review') review++;
      else if (item.status === 'in-progress') inProgress++;
      else pending++;
    });
    
    return { epics, stories, tasks, subtasks, review, inProgress, pending, total: selectedProject.items.length };
  };

  // Render Functions
  const renderHierarchyTree = (items, parentId = null, indent = 0) => {
    const children = items.filter(item => item.parentId === parentId);
    
    return children.map(item => {
      const isExpanded = expandedItems.has(item.id);
      const hasChildren = item.children && item.children.length > 0;
      const progress = calculateProgress(items, item.id);
      const hours = calculateRollupHours(items, item.id);
      
      return (
        <div key={item.id} className="border-l-2 border-gray-200">
          <div 
            className={`flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer ${getLevelColor(item.level)} border rounded mb-1`}
            style={{ marginLeft: `${indent * 20}px` }}
          >
            {hasChildren ? (
              <button onClick={() => toggleExpand(item.id)} className="hover:bg-gray-200 rounded p-1">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : <div className="w-6" />}
            
            <span className="text-lg">{getItemIcon(item.type)}</span>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{item.name}</span>
                {item.jira ? (
                  <a 
                    href={item.jira.issueUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold hover:bg-purple-200 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                    title="View in Jira"
                  >
                    {item.jira.issueKey}
                    <ExternalLink size={12} />
                  </a>
                ) : jiraConfig.connected && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded" title="Not synced to Jira">
                    Not in Jira
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {item.assignee} • {hours.actual}h / {hours.estimated}h • {Math.round(progress)}% complete
              </div>
            </div>
            
            <select
              value={item.status}
              onChange={(e) => {
                e.stopPropagation();
                updateItemStatus(selectedProject.id, item.id, e.target.value);
              }}
              className={`px-2 py-1 rounded text-xs font-semibold border-0 ${
                item.status === 'review' ? 'bg-green-100 text-green-700' :
                item.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
            </select>
            
            <div className="flex gap-1">
              {!item.jira && jiraConfig.connected && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    syncItemToJira(item);
                  }} 
                  className="text-purple-600 hover:text-purple-800 p-1"
                  title="Sync to Jira"
                >
                  <Link2 size={16} />
                </button>
              )}
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  setSelectedItem(item); 
                  setShowItemDetailsModal(true); 
                }} 
                className="text-blue-600 hover:text-blue-800 p-1"
                title="View details"
              >
                <MessageSquare size={16} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(selectedProject.id, item.id);
                }} 
                className="text-red-600 hover:text-red-800 p-1"
                title="Delete item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          {isExpanded && hasChildren && renderHierarchyTree(items, item.id, indent + 1)}
        </div>
      );
    });
  };

  const renderTimeline = () => {
    if (!selectedProject) return <div>Select a project</div>;

    const filteredItems = selectedProject.items.filter(item => {
      if (item.type === 'epic' && !timelineFilters.showEpics) return false;
      if (item.type === 'story' && !timelineFilters.showStories) return false;
      if (item.type === 'task' && !timelineFilters.showTasks) return false;
      if (item.type === 'subtask' && !timelineFilters.showSubtasks) return false;
      return true;
    });

    const getDatePosition = (date, startDate, endDate) => {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const current = new Date(date).getTime();
      return ((current - start) / (end - start)) * 100;
    };

    const renderTimelineBars = (items, parentId = null, indent = 0) => {
      const children = items.filter(item => item.parentId === parentId);
      
      return children.map(item => {
        const startPos = getDatePosition(item.startDate, selectedProject.startDate, selectedProject.endDate);
        const endPos = getDatePosition(item.endDate, selectedProject.startDate, selectedProject.endDate);
        const width = Math.max(endPos - startPos, 2);
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.has(item.id);

        return (
          <div key={item.id}>
            <div className="mb-4" style={{ marginLeft: `${indent * 20}px` }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {hasChildren && (
                    <button onClick={() => toggleExpand(item.id)} className="hover:bg-gray-200 rounded p-1">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                  <span className="text-sm">{getItemIcon(item.type)}</span>
                  <span className="font-semibold text-sm">{item.name}</span>
                  {item.jira && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {item.jira.issueKey}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600">{item.assignee}</span>
              </div>
              <div className="relative h-8 bg-gray-100 rounded">
                <div
                  className={`absolute h-full rounded flex items-center justify-center text-white text-xs font-semibold px-2 ${
                    item.status === 'review' ? 'bg-green-500' :
                    item.status === 'in-progress' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}
                  style={{ left: `${startPos}%`, width: `${width}%` }}
                >
                  {width > 15 && (
                    <>
                      {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                      {new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </>
                  )}
                </div>
              </div>
            </div>
            {isExpanded && hasChildren && renderTimelineBars(items, item.id, indent + 1)}
          </div>
        );
      });
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{selectedProject.name} - Timeline</h2>
          <button
            onClick={exportData}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            Export
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex gap-4 items-center flex-wrap">
            <span className="font-semibold text-sm">Show Levels:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={timelineFilters.showEpics}
                onChange={(e) => setTimelineFilters({...timelineFilters, showEpics: e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm">📦 Epics</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={timelineFilters.showStories}
                onChange={(e) => setTimelineFilters({...timelineFilters, showStories: e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm">📖 Stories</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={timelineFilters.showTasks}
                onChange={(e) => setTimelineFilters({...timelineFilters, showTasks: e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm">✓ Tasks</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={timelineFilters.showSubtasks}
                onChange={(e) => setTimelineFilters({...timelineFilters, showSubtasks: e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm">○ Subtasks</span>
            </label>
          </div>

          <div className="space-y-2">
            {renderTimelineBars(filteredItems, null, 0)}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between text-sm text-gray-600">
            <span>{new Date(selectedProject.startDate).toLocaleDateString()}</span>
            <span>{new Date(selectedProject.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    if (!selectedProject) return null;
    
    const stats = getItemStats();
    const epicData = selectedProject.items.filter(i => i.type === 'epic').map(epic => ({
      name: epic.name,
      progress: calculateProgress(selectedProject.items, epic.id)
    }));

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Project Analytics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Epic Progress</h3>
            <div className="space-y-3">
              {epicData.map((epic, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{epic.name}</span>
                    <span className="font-semibold">{Math.round(epic.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-6 rounded-full transition-all flex items-center justify-center text-white text-xs font-semibold"
                      style={{ width: `${epic.progress}%` }}
                    >
                      {epic.progress > 10 && `${Math.round(epic.progress)}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Status Distribution</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm">Review</span>
                </div>
                <span className="font-semibold">{stats.review} ({Math.round(stats.review/stats.total*100)}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="font-semibold">{stats.inProgress} ({Math.round(stats.inProgress/stats.total*100)}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-sm">Pending</span>
                </div>
                <span className="font-semibold">{stats.pending} ({Math.round(stats.pending/stats.total*100)}%)</span>
              </div>
            </div>
            <div className="mt-4 h-4 flex rounded-full overflow-hidden">
              <div className="bg-green-500" style={{width: `${stats.review/stats.total*100}%`}}></div>
              <div className="bg-blue-500" style={{width: `${stats.inProgress/stats.total*100}%`}}></div>
              <div className="bg-gray-400" style={{width: `${stats.pending/stats.total*100}%`}}></div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Item Types</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">📦 Epics</span>
                <span className="font-semibold">{stats.epics}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">📖 Stories</span>
                <span className="font-semibold">{stats.stories}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">✓ Tasks</span>
                <span className="font-semibold">{stats.tasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">○ Subtasks</span>
                <span className="font-semibold">{stats.subtasks}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Time Tracking</h3>
            <div className="space-y-3">
              {selectedProject.items.filter(i => i.type === 'epic').map(epic => {
                const hours = calculateRollupHours(selectedProject.items, epic.id);
                return (
                  <div key={epic.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate">{epic.name}</span>
                      <span className="font-semibold">{hours.actual}h / {hours.estimated}h</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full ${hours.actual > hours.estimated ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(hours.actual/hours.estimated*100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const totalProjects = projects.length;
    let totalItems = 0, totalReview = 0, totalInProgress = 0, totalPending = 0;
    
    projects.forEach(p => {
      p.items.forEach(item => {
        totalItems++;
        if (item.status === 'review') totalReview++;
        else if (item.status === 'in-progress') totalInProgress++;
        else totalPending++;
      });
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="text-blue-600 text-sm font-semibold mb-2">TOTAL PROJECTS</div>
            <div className="text-3xl font-bold text-blue-700">{totalProjects}</div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="text-green-600 text-sm font-semibold mb-2">IN REVIEW</div>
            <div className="text-3xl font-bold text-green-700">{totalReview}</div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <div className="text-yellow-600 text-sm font-semibold mb-2">IN PROGRESS</div>
            <div className="text-3xl font-bold text-yellow-700">{totalInProgress}</div>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">PENDING</div>
            <div className="text-3xl font-bold text-gray-700">{totalPending}</div>
          </div>
        </div>

        {jiraConfig.connected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCheck className="text-blue-600" size={20} />
              <span className="text-blue-900 font-semibold">Connected to Jira: {jiraConfig.url}</span>
            </div>
            <button onClick={() => setShowJiraSettingsModal(true)} className="text-blue-600 hover:text-blue-800 text-sm">
              Manage
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Active Projects</h2>
          <div className="space-y-4">
            {projects.map(project => {
              const progress = project.items.length > 0 
                ? (project.items.filter(t => t.status === 'review').length / project.items.length) * 100 
                : 0;
              return (
                <div 
                  key={project.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition cursor-pointer" 
                  onClick={() => { setSelectedProject(project); setActiveView('hierarchy'); }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{project.name}</h3>
                      <p className="text-gray-600 text-sm">{project.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      project.status === 'completed' ? 'bg-green-100 text-green-700' :
                      project.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>{project.items.length} items</span>
                    <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                    <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="text-right text-sm text-gray-600 mt-1">{Math.round(progress)}% complete</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderHierarchy = () => {
    if (!selectedProject) return <div>Select a project</div>;
    
    const stats = getItemStats();
    const syncedItems = selectedProject.items.filter(i => i.jira).length;
    const totalItems = selectedProject.items.length;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
            <p className="text-gray-600">{selectedProject.description}</p>
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              <span>📦 {stats.epics} Epics</span>
              <span>📖 {stats.stories} Stories</span>
              <span>✓ {stats.tasks} Tasks</span>
              <span>○ {stats.subtasks} Subtasks</span>
              {jiraConfig.connected && (
                <span className="text-purple-600 font-semibold">
                  🔗 {syncedItems}/{totalItems} synced to Jira
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {jiraConfig.connected && (
              <button
                onClick={importFromJira}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Download size={20} />
                Import from Jira
              </button>
            )}
            <button
              onClick={() => setShowItemModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Add Item
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-bold mb-4">Hierarchy View</h3>
          <div className="space-y-2">
            {renderHierarchyTree(selectedProject.items, null, 0)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              Project Manager Pro
              {useBackend && backendConnected && (
                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  <Wifi size={12} /> Team Sync
                </span>
              )}
              {useBackend && !backendConnected && (
                <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                  <WifiOff size={12} /> Offline
                </span>
              )}
            </h1>
            <div className="text-xs text-gray-500 mt-1">
              Multi-Level Hierarchy • Advanced Analytics
              {lastSyncTime && ` • Last sync: ${new Date(lastSyncTime).toLocaleTimeString()}`}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowBackendSettings(true)}
              className={`${useBackend && backendConnected ? 'bg-green-600' : 'bg-gray-600'} text-white px-3 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 text-sm`}
            >
              {useBackend && backendConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              {useBackend ? 'Backend' : 'Local Only'}
            </button>
            <button
              onClick={exportData}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              Export
            </button>
            {jiraConfig.connected ? (
              <button
                onClick={() => setShowJiraSettingsModal(true)}
                className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
              >
                <Settings size={16} />
                Jira
              </button>
            ) : (
              <button
                onClick={() => setShowJiraSettingsModal(true)}
                className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
              >
                <Link2 size={16} />
                Connect Jira
              </button>
            )}
            <button
              onClick={() => setShowProjectModal(true)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* View Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <BarChart3 size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('hierarchy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${activeView === 'hierarchy' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <ChevronRight size={18} />
            Hierarchy
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${activeView === 'timeline' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <Calendar size={18} />
            Timeline
          </button>
          <button
            onClick={() => setActiveView('charts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${activeView === 'charts' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <TrendingUp size={18} />
            Analytics
          </button>
        </div>

        {/* View Content */}
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'hierarchy' && renderHierarchy()}
        {activeView === 'timeline' && renderTimeline()}
        {activeView === 'charts' && renderCharts()}
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter description"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={addProject}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Project
              </button>
              <button
                onClick={() => setShowProjectModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Item</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Type</label>
                <div className="flex gap-2">
                  {['epic', 'story', 'task', 'subtask'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewItem({...newItem, type})}
                      className={`flex-1 px-3 py-2 rounded border text-sm ${
                        newItem.type === type 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {getItemIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Parent Item (Optional)</label>
                <select
                  value={newItem.parentId || ''}
                  onChange={(e) => setNewItem({...newItem, parentId: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">None (Top Level)</option>
                  {selectedProject.items
                    .filter(item => {
                      if (newItem.type === 'epic') return false;
                      if (newItem.type === 'story') return item.type === 'epic';
                      if (newItem.type === 'task') return item.type === 'story';
                      if (newItem.type === 'subtask') return item.type === 'task';
                      return false;
                    })
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {getItemIcon(item.type)} {item.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter item name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Status</label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Priority</label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Assignee</label>
                <input
                  type="text"
                  value={newItem.assignee}
                  onChange={(e) => setNewItem({ ...newItem, assignee: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter assignee name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newItem.startDate}
                    onChange={(e) => setNewItem({ ...newItem, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={newItem.endDate}
                    onChange={(e) => setNewItem({ ...newItem, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Estimated Hours</label>
                <input
                  type="number"
                  value={newItem.estimatedHours}
                  onChange={(e) => setNewItem({ ...newItem, estimatedHours: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
              {jiraConfig.connected && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="createInJira"
                      checked={newItem.createInJira}
                      onChange={(e) => setNewItem({ ...newItem, createInJira: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="createInJira" className="text-sm font-semibold text-purple-900">
                      🔗 Create in Jira
                    </label>
                  </div>
                  <p className="text-xs text-purple-700 ml-6">
                    Will create as: <strong>
                      {newItem.type === 'epic' ? 'Epic' : 
                       newItem.type === 'story' ? 'Story' : 
                       newItem.type === 'task' ? 'Task' : 'Sub-task'}
                    </strong> in project <strong>{jiraConfig.defaultProject}</strong>
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={addItem}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Item
              </button>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setNewItem({ name: '', type: 'task', parentId: null, status: 'pending', priority: 'medium', startDate: '', endDate: '', assignee: '', estimatedHours: 0, createInJira: false });
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {showItemDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getItemIcon(selectedItem.type)}</span>
                  <h2 className="text-xl font-bold">{selectedItem.name}</h2>
                </div>
                {selectedItem.jira && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {selectedItem.jira.issueKey}
                    </span>
                    <a 
                      href={selectedItem.jira.issueUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      View in Jira <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowItemDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-sm text-gray-600">Type:</span>
                <div className="mt-1 font-semibold capitalize">{selectedItem.type}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedItem.status === 'review' ? 'bg-green-100 text-green-700' :
                    selectedItem.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Priority:</span>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedItem.priority === 'high' ? 'bg-red-100 text-red-700' :
                    selectedItem.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedItem.priority}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Assignee:</span>
                <div className="mt-1 font-semibold">{selectedItem.assignee || 'Unassigned'}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Hours:</span>
                <div className="mt-1 font-semibold">{selectedItem.actualHours}h / {selectedItem.estimatedHours}h</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Due Date:</span>
                <div className="mt-1 font-semibold">{new Date(selectedItem.endDate).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold mb-3">Comments</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {selectedItem.comments && selectedItem.comments.length > 0 ? (
                  selectedItem.comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{comment.author}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No comments yet</p>
                )}
              </div>

              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Add a comment..."
                  rows="3"
                />
                <button
                  onClick={addComment}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jira Settings Modal */}
      {showJiraSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Jira Integration Settings</h2>
            
            {jiraConfig.connected ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCheck className="text-green-600" size={20} />
                    <span className="font-semibold text-green-900">Connected to Jira</span>
                  </div>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>URL:</strong> {jiraConfig.url}</p>
                    <p><strong>Email:</strong> {jiraConfig.email}</p>
                    <p><strong>Project:</strong> {jiraConfig.defaultProject}</p>
                  </div>
                </div>

                <button
                  onClick={disconnectJira}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="text-blue-900 mb-2"><strong>How to connect:</strong></p>
                  <ol className="text-blue-800 space-y-1 list-decimal list-inside text-xs">
                    <li>Go to your Jira account settings</li>
                    <li>Navigate to Security → API tokens</li>
                    <li>Click "Create API token"</li>
                    <li>Copy and paste below</li>
                  </ol>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
                  <p className="text-purple-900 mb-2"><strong>How sync works:</strong></p>
                  <ul className="text-purple-800 space-y-1 text-xs">
                    <li>✓ Epic → Jira Epic</li>
                    <li>✓ Story → Jira Story</li>
                    <li>✓ Task → Jira Task</li>
                    <li>✓ Subtask → Jira Sub-task</li>
                    <li>✓ Status updates sync automatically</li>
                    <li>✓ Use checkbox when creating items</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Jira URL</label>
                  <input
                    type="text"
                    value={jiraConfig.url}
                    onChange={(e) => setJiraConfig({ ...jiraConfig, url: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="https://yourcompany.atlassian.net"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={jiraConfig.email}
                    onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="your.email@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">API Token</label>
                  <input
                    type="password"
                    value={jiraConfig.apiToken}
                    onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter your API token"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Project Key</label>
                  <input
                    type="text"
                    value={jiraConfig.defaultProject}
                    onChange={(e) => setJiraConfig({ ...jiraConfig, defaultProject: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., PROJ, TEAM"
                  />
                </div>

                <button
                  onClick={connectToJira}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Connect to Jira
                </button>
              </div>
            )}

            <button
              onClick={() => setShowJiraSettingsModal(false)}
              className="w-full mt-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Import from Jira Preview</h2>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-purple-900">Found {importPreview.length} issues from Jira</h3>
              <p className="text-sm text-purple-800">Review and confirm to import these issues into your project</p>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Jira Key</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Priority</th>
                    <th className="text-left p-3">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 20).map((item, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="p-3">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold">
                          {item.jira.issueKey}
                        </span>
                      </td>
                      <td className="p-3">{getItemIcon(item.type)} {item.type}</td>
                      <td className="p-3 max-w-xs truncate">{item.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.status === 'review' ? 'bg-green-100 text-green-700' :
                          item.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.priority === 'high' ? 'bg-red-100 text-red-700' :
                          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="p-3">{item.assignee || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 20 && (
                <div className="p-3 bg-gray-50 text-center text-sm text-gray-600">
                  ... and {importPreview.length - 20} more items
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmImport}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Import {importPreview.length} Items from Jira
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backend Settings Modal */}
      {showBackendSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Team Sync Settings (SQLite Backend)</h2>
            
            <div className="space-y-4">
              {useBackend && backendConnected ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="text-green-600" size={20} />
                    <span className="font-semibold text-green-900">Connected to Backend</span>
                  </div>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Server:</strong> {backendUrl}</p>
                    <p><strong>Status:</strong> Real-time team sync active</p>
                    <p><strong>Last sync:</strong> {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={syncFromBackend}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      <RefreshCw size={14} className="inline mr-1" />
                      Sync Now
                    </button>
                    <button
                      onClick={disableBackend}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                      <li>Create server.js with Express + SQLite</li>
                      <li>Install: npm install express cors sqlite3</li>
                      <li>Run: node server.js</li>
                      <li>Server starts on port 3001</li>
                      <li>Enter server URL below and connect</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Backend Server URL</label>
                    <input
                      type="text"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="http://localhost:3001/api"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      For team access, use: http://YOUR-IP-ADDRESS:3001/api
                    </p>
                  </div>

                  <button
                    onClick={enableBackend}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Wifi size={16} className="inline mr-2" />
                    Connect to Backend
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setShowBackendSettings(false)}
              className="w-full mt-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;