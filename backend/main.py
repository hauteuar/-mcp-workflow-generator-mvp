import os
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from agent import Agent
from workflows import WorkflowRegistry
from subprocess import Popen, PIPE
import json
from typing import Dict

app = FastAPI(title='MCP Agent Workflow MVP')

agent = Agent(os.getenv('LLM_API_URL', 'http://localhost:8000/v1/generate'))
registry = WorkflowRegistry('backend/settings.json')

class WorkflowSpec(BaseModel):
    workflow_name: str
    version: str
    description: str = ''
    team: str = ''
    tools: list
    workflow_edges: list = []
    deployment: dict = {}


@app.post('/api/generate_preview')
async def generate_preview(spec: WorkflowSpec):
    code = await agent.request_code_preview(spec.dict())
    return {'preview': code}


@app.post('/api/generate')
async def generate(spec: WorkflowSpec, background_tasks: BackgroundTasks):
    result = await agent.generate_mcp_server(spec.dict())
    # Save to registry
    registry.add_entry(result['registry_entry'])
    # Optionally start batch preprocess
    if any(t.get('batch_preprocess') for t in spec.tools):
        background_tasks.add_task(agent.batch_preprocess, spec.dict())
    return result


@app.post('/api/deploy')
def deploy(payload: Dict):
    path = payload.get('path')
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=400, detail='Invalid path')
    # start process
    logfile = open(path + '.log', 'a')
    proc = Popen(['python', path], stdout=logfile, stderr=logfile)
    return {'pid': proc.pid}


@app.post('/api/stop')
def stop(payload: Dict):
    pid = payload.get('pid')
    if not pid:
        raise HTTPException(status_code=400, detail='pid required')
    try:
        os.kill(pid, 15)
        return {'stopped': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/servers')
def list_servers():
    return registry.list_entries()


@app.get('/api/logs/{name}')
def get_logs(name: str):
    path = f'backend/mcp_servers/{name}.py.log'
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='log not found')
    with open(path) as f:
        return {'log': f.read()}
