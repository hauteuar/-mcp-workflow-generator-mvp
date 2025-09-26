import os, json, requests, uuid, asyncio, time
from typing import Dict

LLM_API = os.getenv('LLM_API_URL', 'http://localhost:8000/v1/generate')

class Agent:
    def __init__(self, llm_api: str = None):
        self.llm_api = llm_api or LLM_API

    async def request_code_preview(self, spec: Dict):
        prompt = self._build_code_prompt(spec, preview=True)
        resp = requests.post(self.llm_api, json={'prompt': prompt, 'max_tokens': 1200})
        return resp.text if resp.status_code == 200 else resp.text

    async def generate_mcp_server(self, spec: Dict):
        prompt = self._build_code_prompt(spec, preview=False)
        resp = requests.post(self.llm_api, json={'prompt': prompt, 'max_tokens': 4000})
        if resp.status_code != 200:
            return {'error': resp.text}
        code = resp.text
        # write file
        fname = f"backend/mcp_servers/mcp_server_{spec['workflow_name']}_v{spec['version']}.py"
        os.makedirs(os.path.dirname(fname), exist_ok=True)
        with open(fname, 'w') as f:
            f.write(code)
        registry_entry = {
            'mcp_server_id': f"{spec['workflow_name']}_v{spec['version']}",
            'name': spec['workflow_name'],
            'version': spec['version'],
            'tools': spec['tools'],
            'path': fname,
            'deployed': False,
            'team': spec.get('team',''),
            'vault_refs': [t.get('vault_ref') for t in spec['tools'] if t.get('vault_ref')],
            'audit': {'generated_by': 'agent', 'timestamp': time.time()}
        }
        return {'file': fname, 'registry_entry': registry_entry}

    def _build_code_prompt(self, spec: Dict, preview=False) -> str:
        # Master prompt (shortened). The real prompt should be the detailed master prompt provided separately.
        header = f"# Generate MCP STDIO server for workflow: {spec.get('workflow_name')} v{spec.get('version')}\n"
        header += "# Use get_secret(vault_ref) for secrets. Make code runnable.\n\n"
        body = json.dumps(spec, indent=2)
        return header + body


