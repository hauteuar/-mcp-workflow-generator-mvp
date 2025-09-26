import React, {useState} from 'react';
import ChatPanel from './components/ChatPanel';
import WorkflowBuilder from './components/WorkflowBuilder';
import ToolRegistry from './components/ToolRegistry';
import HistoryPanel from './components/HistoryPanel';
import './App.css';

export default function App(){ 
  const [tab, setTab] = useState('chat');
  return (
    <div className='app'>
      <header className='header'>MCP Agent Workflow MVP</header>
      <div className='sidebar'>
        <button onClick={()=>setTab('chat')}>Chat</button>
        <button onClick={()=>setTab('builder')}>Builder</button>
        <button onClick={()=>setTab('tools')}>Tools</button>
        <button onClick={()=>setTab('history')}>History</button>
      </div>
      <main className='main'>
        {tab==='chat' && <ChatPanel/>}
        {tab==='builder' && <WorkflowBuilder/>}
        {tab==='tools' && <ToolRegistry/>}
        {tab==='history' && <HistoryPanel/>}
      </main>
    </div>
  );
}
