# MCP Agent Workflow - MVP Repo

This repository is an MVP scaffold for **MCP.ai - Agentic Workflow Platform**.
It includes a FastAPI backend (generator + agent), mock/stub MCP stdio servers, and a minimal React frontend.
This scaffold is designed to integrate with **real services** (Oracle, Hive, Tableau, SharePoint) when you configure credentials, and to call a **local vLLM** or other LLM endpoint for agent reasoning.

> NOTE: This repo is an MVP scaffold. You must provide real service credentials, drivers and run a local vLLM endpoint (or other LLM API) for full production use.

## Contents
- `backend/` - FastAPI backend, agent, mock MCP stdio servers (stubs)
- `frontend/` - Minimal React app (CRA-like structure) with Chat, Workflow Builder, Tool Registry
- `docker-compose.yml` - Bring up backend + frontend for local testing (uses uvicorn and a simple node static serve)
- `backend/requirements.txt` - Python dependencies

## Quickstart (local dev)

1. Install Docker & Docker Compose (recommended) or run components manually.

2. Configure environment variables (create a `.env` file or export env vars):

```
# LLM (vllm or local LLM proxy)
LLM_API_URL=http://localhost:8000/v1/generate
# Example: if you run vllm server, set accordingly.

# Tableau (if used)
TABLEAU_SERVER=https://tableau.example.com
TABLEAU_SITE=Default
TABLEAU_PAT_VAULT_REF=vault://tableau/pat

# Oracle / DB2 / Hive
ORACLE_DSN=...
DB2_DSN=...
HIVE_HOST=...

# Vault: this scaffold expects vault references in workflow JSON; implement get_secret() accordingly.
```

3. Start services with Docker Compose (or run backend/frontend manually):
```
docker-compose up --build
```

4. Open http://localhost:3000 for the frontend and http://localhost:8000/docs for backend API docs.

## How the agent uses vLLM
The agent (`backend/agent.py`) calls the LLM endpoint defined in `LLM_API_URL`. For vLLM, run a local vLLM HTTP server (or a compatible wrapper) and point `LLM_API_URL` to it. The agent sends a JSON prompt with the workflow spec and expects a code-generation or plan response.

## Generating MCP servers
- Use the frontend Workflow Builder to create a workflow and "Generate" — the backend will call your configured LLM to generate a versioned STDIO MCP server Python file and save under `backend/mcp_servers/`.
- Review and deploy the generated server via the backend APIs.

## Notes on real services
- Oracle: install `cx_Oracle` and configure `ORACLE_DSN` / wallet as per Oracle docs.
- DB2: install `ibm_db` and configure DSN.
- Hive: use `PyHive`/`thrift` and configure Kerberos if required.
- Tableau: use Tableau REST API or Hyper API; PAT token stored via vault_ref.
- SharePoint/OneDrive: use Microsoft Graph with OAuth; configure SSO or app registration.

## Limitations
- This scaffold contains **stubs** for MCP stdio servers (to simulate behavior). Replace with generated MCP servers produced by the LLM for full production flows.
- Make sure to secure Vault and SSO in production.

---
