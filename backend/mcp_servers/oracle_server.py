#!/usr/bin/env python3
# MCP STDIO stub for Oracle - echoes queries and demonstrates get_secret usage.
import json, sys, asyncio
# Placeholder for a real MCP server import. Replace with the MCP library you're using.
# from mcp.server.stdio import stdio_server

def get_secret(vault_ref):
    # Implement vault secret fetch in production. Placeholder here.
    return '<secret_from_vault:%s>' % vault_ref

async def handle_request(req_json):
    try:
        req = json.loads(req_json)
        # Expecting {'sql': 'SELECT ...'}
        sql = req.get('sql','')
        # Basic protection
        lowered = sql.lower()
        if any(x in lowered for x in ['drop ', 'delete ', 'alter ', 'update ', 'insert ']):
            return json.dumps({'error':'Destructive SQL disallowed in stub'})
        # In production, connect to Oracle using cx_Oracle and execute.
        # Simulate result
        return json.dumps({'rows':[{'ticker':'ABC','price':123.45}], 'sql': sql})
    except Exception as e:
        return json.dumps({'error': str(e)})

async def stdin_loop():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        resp = await handle_request(line)
        print(resp, flush=True)

if __name__ == '__main__':
    asyncio.run(stdin_loop())
