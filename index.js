import React, { useState } from 'react';
import { Plus, Calendar, BarChart3, CheckCircle2, Circle, Trash2, Edit2, Upload, Settings, Link2, ExternalLink, MessageSquare, CheckCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

const ProjectManager = () => {
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'Website Redesign',
      description: 'Complete overhaul of company website',
      startDate: '2025-10-01',
      endDate: '2025-12-31',
      status: 'in-progress',
      tasks: [
        { 
          id: 1, 
          name: 'Research & Planning', 
          status: 'review', 
          priority: 'high', 
          startDate: '2025-10-01', 
          endDate: '2025-10-15', 
          assignee: 'John',
          comments: [],
          jira: null
        },
        { 
          id: 2, 
          name: 'Design Mockups', 
          status: 'in-progress', 
          priority: 'high', 
          startDate: '2025-10-16', 
          endDate: '2025-11-15', 
          assignee: 'Sarah',
          comments: [],
          jira: null
        },
        { 
          id: 3, 
          name: 'Development', 
          status: 'pending', 
          priority: 'medium', 
          startDate: '2025-11-16', 
          endDate: '2025-12-20', 
          assignee: 'Mike',
          comments: [],
          jira: null
        },
      ]
    }
  ]);

  const [activeView, setActiveView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showJiraSettingsModal, setShowJiraSettingsModal] = useState(false);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [importPreview, setImportPreview] = useState(null);

  const [jiraConfig, setJiraConfig] = useState({
    url: '',
    email: '',
    apiToken: '',
    defaultProject: '',
    autoSync: false,
    connected: false
  });

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'planning'
  });

  const [newTask, setNewTask] = useState({
    name: '',
    status: 'pending',
    priority: 'medium',
    startDate: '',
    endDate: '',
    assignee: '',
    createInJira: false
  });

  const [newComment, setNewComment] = useState('');
  const [postToJira, setPostToJira] = useState(false);

  const addProject = () => {
    if (newProject.name && newProject.startDate && newProject.endDate) {
      setProjects([...projects, {
        ...newProject,
        id: Date.now(),
        tasks: []
      }]);
      setNewProject({ name: '', description: '', startDate: '', endDate: '', status: 'planning' });
      setShowProjectModal(false);
    }
  };

  const addTask = async () => {
    if (selectedProject && newTask.name && newTask.startDate && newTask.endDate) {
      const taskToAdd = { 
        ...newTask, 
        id: Date.now(),
        comments: [],
        jira: null
      };

      if (newTask.createInJira && jiraConfig.connected) {
        const jiraIssue = await createJiraIssue(taskToAdd);
        if (jiraIssue) {
          taskToAdd.jira = jiraIssue;
        }
      }

      const updatedProjects = projects.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            tasks: [...p.tasks, taskToAdd]
          };
        }
        return p;
      });
      setProjects(updatedProjects);
      setNewTask({ name: '', status: 'pending', priority: 'medium', startDate: '', endDate: '', assignee: '', createInJira: false });
      setShowTaskModal(false);
    }
  };

  const updateTask = async () => {
    if (selectedProject && editingTask && newTask.name) {
      const taskToUpdate = { ...newTask, id: editingTask.id, comments: editingTask.comments, jira: editingTask.jira };

      if (taskToUpdate.jira && jiraConfig.autoSync) {
        await updateJiraIssue(taskToUpdate);
      }

      const updatedProjects = projects.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            tasks: p.tasks.map(t => t.id === editingTask.id ? taskToUpdate : t)
          };
        }
        return p;
      });
      setProjects(updatedProjects);
      setEditingTask(null);
      setNewTask({ name: '', status: 'pending', priority: 'medium', startDate: '', endDate: '', assignee: '', createInJira: false });
      setShowTaskModal(false);
    }
  };

  const updateTaskStatus = async (projectId, taskId, newStatus) => {
    const updatedProjects = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              const updatedTask = { ...t, status: newStatus };
              if (t.jira && jiraConfig.connected) {
                updateJiraStatus(updatedTask);
              }
              return updatedTask;
            }
            return t;
          })
        };
      }
      return p;
    });
    setProjects(updatedProjects);
  };

  const deleteTask = (projectId, taskId) => {
    const updatedProjects = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          tasks: p.tasks.filter(t => t.id !== taskId)
        };
      }
      return p;
    });
    setProjects(updatedProjects);
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedTask) return;

    const comment = {
      id: Date.now(),
      text: newComment,
      author: 'Current User',
      timestamp: new Date().toISOString(),
      postedToJira: postToJira && selectedTask.jira
    };

    if (postToJira && selectedTask.jira && jiraConfig.connected) {
      await postJiraComment(selectedTask.jira.issueKey, newComment);
    }

    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === selectedTask.id) {
              return {
                ...t,
                comments: [...(t.comments || []), comment]
              };
            }
            return t;
          })
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    setNewComment('');
    setPostToJira(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      const mappedTasks = jsonData.map((row, index) => {
        const taskName = row['Task Name'] || row['Task'] || row['Name'] || row['Summary'] || '';
        const status = (row['Status'] || 'pending').toLowerCase();
        const priority = (row['Priority'] || 'medium').toLowerCase();
        const assignee = row['Assignee'] || row['Assigned To'] || '';
        const startDate = row['Start Date'] || row['Created'] || new Date().toISOString().split('T')[0];
        const endDate = row['End Date'] || row['Due Date'] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        return {
          id: Date.now() + index,
          name: taskName,
          status: ['pending', 'in-progress', 'review'].includes(status) ? status : 'pending',
          priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
          assignee: assignee,
          startDate: formatDateFromExcel(startDate),
          endDate: formatDateFromExcel(endDate),
          comments: [],
          jira: null
        };
      }).filter(task => task.name);

      setImportPreview(mappedTasks);
    } catch (error) {
      alert('Error reading file. Please make sure it is a valid Excel or CSV file.');
    }
  };

  const formatDateFromExcel = (dateValue) => {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const confirmImport = () => {
    if (!selectedProject || !importPreview) return;

    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          tasks: [...p.tasks, ...importPreview]
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    setShowImportModal(false);
    setImportPreview(null);
    alert(`Successfully imported ${importPreview.length} tasks!`);
  };

  const createJiraIssue = async (task) => {
    if (!jiraConfig.connected) return null;
    
    console.log('Creating Jira issue:', task.name);

    return {
      issueKey: `${jiraConfig.defaultProject}-${Math.floor(Math.random() * 1000)}`,
      issueId: String(Date.now()),
      issueUrl: `${jiraConfig.url}/browse/${jiraConfig.defaultProject}-${Math.floor(Math.random() * 1000)}`,
      lastSynced: new Date().toISOString(),
      syncStatus: 'synced'
    };
  };

  const updateJiraIssue = async (task) => {
    if (!task.jira || !jiraConfig.connected) return;
    console.log('Updating Jira issue:', task.jira.issueKey);
  };

  const updateJiraStatus = async (task) => {
    if (!task.jira || !jiraConfig.connected) return;
    console.log('Updating Jira status:', task.jira.issueKey, 'to', task.status);
  };

  const postJiraComment = async (issueKey, comment) => {
    if (!jiraConfig.connected) return;
    console.log('Posting comment to Jira:', issueKey, comment);
  };

  const importFromJira = async () => {
    if (!jiraConfig.connected) {
      alert('Please connect to Jira first in Settings');
      return;
    }

    const mockJiraIssues = [
      {
        key: `${jiraConfig.defaultProject}-101`,
        fields: {
          summary: 'Setup authentication system',
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          assignee: { displayName: 'Alice' },
          created: '2025-10-01',
          duedate: '2025-10-20'
        }
      },
      {
        key: `${jiraConfig.defaultProject}-102`,
        fields: {
          summary: 'Create database schema',
          status: { name: 'To Do' },
          priority: { name: 'Medium' },
          assignee: { displayName: 'Bob' },
          created: '2025-10-02',
          duedate: '2025-10-25'
        }
      }
    ];

    const mappedTasks = mockJiraIssues.map(issue => ({
      id: Date.now() + Math.random(),
      name: `${issue.key}: ${issue.fields.summary}`,
      status: issue.fields.status.name === 'In Progress' ? 'in-progress' : 
              issue.fields.status.name === 'Done' ? 'review' : 'pending',
      priority: (issue.fields.priority?.name || 'medium').toLowerCase(),
      assignee: issue.fields.assignee?.displayName || '',
      startDate: issue.fields.created || new Date().toISOString().split('T')[0],
      endDate: issue.fields.duedate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      comments: [],
      jira: {
        issueKey: issue.key,
        issueId: String(Date.now()),
        issueUrl: `${jiraConfig.url}/browse/${issue.key}`,
        lastSynced: new Date().toISOString(),
        syncStatus: 'synced'
      }
    }));

    setImportPreview(mappedTasks);
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
      url: '',
      email: '',
      apiToken: '',
      defaultProject: '',
      autoSync: false,
      connected: false
    });
    alert('Disconnected from Jira');
  };

  const getTaskStats = () => {
    let total = 0, review = 0, inProgress = 0, pending = 0;
    projects.forEach(p => {
      p.tasks.forEach(t => {
        total++;
        if (t.status === 'review') review++;
        else if (t.status === 'in-progress') inProgress++;
        else pending++;
      });
    });
    return { total, review, inProgress, pending };
  };

  const stats = getTaskStats();

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="text-blue-600 text-sm font-semibold mb-2">TOTAL PROJECTS</div>
          <div className="text-3xl font-bold text-blue-700">{projects.length}</div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="text-green-600 text-sm font-semibold mb-2">IN REVIEW</div>
          <div className="text-3xl font-bold text-green-700">{stats.review}</div>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="text-yellow-600 text-sm font-semibold mb-2">IN PROGRESS</div>
          <div className="text-3xl font-bold text-yellow-700">{stats.inProgress}</div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="text-gray-600 text-sm font-semibold mb-2">PENDING TASKS</div>
          <div className="text-3xl font-bold text-gray-700">{stats.pending}</div>
        </div>
      </div>

      {jiraConfig.connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCheck className="text-blue-600" size={20} />
            <span className="text-blue-900 font-semibold">Connected to Jira: {jiraConfig.url}</span>
          </div>
          <button onClick={() => setShowJiraSettingsModal(true)} className="text-blue-600 hover:text-blue-800 text-sm">
            Manage Connection
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Active Projects</h2>
        <div className="space-y-4">
          {projects.map(project => {
            const progress = project.tasks.length > 0 
              ? (project.tasks.filter(t => t.status === 'review').length / project.tasks.length) * 100 
              : 0;
            return (
              <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition cursor-pointer" onClick={() => { setSelectedProject(project); setActiveView('tasks'); }}>
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
                  <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                  <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
                  <span>{project.tasks.length} tasks</span>
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

  const renderTasks = () => {
    if (!selectedProject) return <div>Select a project</div>;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
            <p className="text-gray-600">{selectedProject.description}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {jiraConfig.connected && (
              <button
                onClick={importFromJira}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Link2 size={20} />
                Import from Jira
              </button>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Upload size={20} />
              Import Tasks
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Add Task
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold">Task Name</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Priority</th>
                <th className="text-left p-4 font-semibold">Assignee</th>
                <th className="text-left p-4 font-semibold">Start Date</th>
                <th className="text-left p-4 font-semibold">End Date</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedProject.tasks.map(task => (
                <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {task.status === 'review' ? <CheckCircle2 className="text-green-600" size={20} /> : <Circle className="text-gray-400" size={20} />}
                      <span>{task.name}</span>
                      {task.jira && (
                        <a 
                          href={task.jira.issueUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(selectedProject.id, task.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-semibold border-0 cursor-pointer ${
                        task.status === 'review' ? 'bg-green-100 text-green-700' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="p-4">{task.assignee}</td>
                  <td className="p-4 text-sm">{new Date(task.startDate).toLocaleDateString()}</td>
                  <td className="p-4 text-sm">{new Date(task.endDate).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { 
                          setSelectedTask(task); 
                          setShowTaskDetailsModal(true); 
                        }} 
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button onClick={() => { setEditingTask(task); setNewTask({...task, createInJira: false}); setShowTaskModal(true); }} className="text-blue-600 hover:text-blue-800">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => deleteTask(selectedProject.id, task.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    if (!selectedProject) return <div>Select a project</div>;

    const getDatePosition = (date, startDate, endDate) => {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const current = new Date(date).getTime();
      return ((current - start) / (end - start)) * 100;
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{selectedProject.name} - Timeline</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-6">
            {selectedProject.tasks.map(task => {
              const startPos = getDatePosition(task.startDate, selectedProject.startDate, selectedProject.endDate);
              const endPos = getDatePosition(task.endDate, selectedProject.startDate, selectedProject.endDate);
              const width = endPos - startPos;

              return (
                <div key={task.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{task.name}</span>
                      {task.jira && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {task.jira.issueKey}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{task.assignee}</span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded">
                    <div
                      className={`absolute h-full rounded ${
                        task.status === 'review' ? 'bg-green-500' :
                        task.status === 'in-progress' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}
                      style={{ left: `${startPos}%`, width: `${width}%` }}
                    >
                      <div className="flex items-center justify-center h-full text-white text-xs font-semibold px-2">
                        {new Date(task.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                        {new Date(task.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between text-sm text-gray-600">
            <span>{new Date(selectedProject.startDate).toLocaleDateString()}</span>
            <span>{new Date(selectedProject.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-gray-800">Project Manager</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowJiraSettingsModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Settings size={20} />
              {jiraConfig.connected ? 'Jira Settings' : 'Connect Jira'}
            </button>
            <button
              onClick={() => setShowProjectModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              New Project
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <BarChart3 size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeView === 'tasks' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <CheckCircle2 size={20} />
            Tasks
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeView === 'timeline' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <Calendar size={20} />
            Timeline
          </button>
        </div>

        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'tasks' && renderTasks()}
        {activeView === 'timeline' && renderTimeline()}
      </div>

      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="planning">Planning</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
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

      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Task Name</label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter task name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
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
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Assignee</label>
                <input
                  type="text"
                  value={newTask.assignee}
                  onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter assignee name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Start Date</label>
                <input
                  type="date"
                  value={newTask.startDate}
                  onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">End Date</label>
                <input
                  type="date"
                  value={newTask.endDate}
                  onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              {!editingTask && jiraConfig.connected && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createInJira"
                    checked={newTask.createInJira}
                    onChange={(e) => setNewTask({ ...newTask, createInJira: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="createInJira" className="text-sm">Create in Jira</label>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={editingTask ? updateTask : addTask}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingTask ? 'Update Task' : 'Add Task'}
              </button>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                  setNewTask({ name: '', status: 'pending', priority: 'medium', startDate: '', endDate: '', assignee: '', createInJira: false });
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskDetailsModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedTask.name}</h2>
                {selectedTask.jira && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {selectedTask.jira.issueKey}
                    </span>
                    <a 
                      href={selectedTask.jira.issueUrl} 
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
                onClick={() => setShowTaskDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedTask.status === 'review' ? 'bg-green-100 text-green-700' :
                    selectedTask.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedTask.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Priority:</span>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                    selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedTask.priority}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Assignee:</span>
                <div className="mt-1 font-semibold">{selectedTask.assignee || 'Unassigned'}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Due Date:</span>
                <div className="mt-1 font-semibold">{new Date(selectedTask.endDate).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold mb-3">Comments</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {selectedTask.comments && selectedTask.comments.length > 0 ? (
                  selectedTask.comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{comment.author}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                          {comment.postedToJira && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              Synced to Jira
                            </span>
                          )}
                        </div>
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
                {selectedTask.jira && jiraConfig.connected && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="postToJira"
                      checked={postToJira}
                      onChange={(e) => setPostToJira(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="postToJira" className="text-sm">Also post to Jira</label>
                  </div>
                )}
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

      {showJiraSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-sm">Auto-sync Changes</div>
                    <div className="text-xs text-gray-600">Automatically sync task updates to Jira</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jiraConfig.autoSync}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, autoSync: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
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
                  <p className="text-blue-900 mb-2"><strong>How to get your Jira API token:</strong></p>
                  <ol className="text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to your Jira account settings</li>
                    <li>Navigate to Security → API tokens</li>
                    <li>Click "Create API token"</li>
                    <li>Copy the token and paste below</li>
                  </ol>
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
                  <label className="block text-sm font-semibold mb-1">Default Project Key</label>
                  <input
                    type="text"
                    value={jiraConfig.defaultProject}
                    onChange={(e) => setJiraConfig({ ...jiraConfig, defaultProject: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., PROJ, DEV, TEAM"
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Import Tasks from Spreadsheet</h2>
            
            {!importPreview ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Spreadsheet Format Guide</h3>
                  <p className="text-sm text-blue-800 mb-2">Your spreadsheet should include these columns (case-insensitive):</p>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    <li><strong>Task Name</strong> or <strong>Task</strong> or <strong>Name</strong> (required)</li>
                    <li><strong>Status</strong> (optional: pending, in-progress, review)</li>
                    <li><strong>Priority</strong> (optional: low, medium, high)</li>
                    <li><strong>Assignee</strong> or <strong>Assigned To</strong> (optional)</li>
                    <li><strong>Start Date</strong> or <strong>Start</strong> (optional)</li>
                    <li><strong>End Date</strong> or <strong>End</strong> (optional)</li>
                  </ul>
                  <p className="text-sm text-blue-800 mt-2">Supported formats: Excel (.xlsx, .xls) and CSV (.csv)</p>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <label className="cursor-pointer">
                    <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block">
                      Choose File
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-600 mt-2">or drag and drop your file here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900">Preview: {importPreview.length} tasks found</h3>
                  <p className="text-sm text-green-800">Review the tasks below and click "Import" to add them to your project.</p>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-semibold">Task Name</th>
                        <th className="text-left p-3 font-semibold">Status</th>
                        <th className="text-left p-3 font-semibold">Priority</th>
                        <th className="text-left p-3 font-semibold">Assignee</th>
                        <th className="text-left p-3 font-semibold">Start</th>
                        <th className="text-left p-3 font-semibold">End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((task, index) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="p-3">{task.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              task.status === 'review' ? 'bg-green-100 text-green-700' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="p-3">{task.assignee || '-'}</td>
                          <td className="p-3">{new Date(task.startDate).toLocaleDateString()}</td>
                          <td className="p-3">{new Date(task.endDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-6 flex-wrap">
              {importPreview ? (
                <>
                  <button
                    onClick={confirmImport}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Import {importPreview.length} Tasks
                  </button>
                  <button
                    onClick={() => setImportPreview(null)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Choose Different File
                  </button>
                </>
              ) : null}
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
    </div>
  );
};

export default ProjectManager;