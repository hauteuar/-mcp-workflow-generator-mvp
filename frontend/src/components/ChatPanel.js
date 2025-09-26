import React, {useState} from 'react';
import axios from 'axios';
export default function ChatPanel(){
  const [q,setQ] = useState('');
  const [resp,setResp] = useState('');
  const ask = async ()=>{
    const r = await axios.post('/api/query',{query:q});
    setResp(JSON.stringify(r.data));
  };
  return (<div>
    <h2>Chat</h2>
    <textarea value={q} onChange={e=>setQ(e.target.value)} rows={4} cols={80}/><br/>
    <button onClick={ask}>Ask Agent</button>
    <pre>{resp}</pre>
  </div>);
}
