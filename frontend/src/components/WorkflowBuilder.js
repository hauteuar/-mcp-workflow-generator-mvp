import React from 'react';
export default function WorkflowBuilder(){
  return (<div><h2>Workflow Builder (MVP)</h2>
    <p>Drag-and-drop builder placeholder. In MVP, you can upload a JSON workflow spec for tests.</p>
    <textarea id='spec' rows={20} cols={80} defaultValue={'{"workflow_name":"test","version":"1","tools":[]}'}></textarea>
  </div>);
}
