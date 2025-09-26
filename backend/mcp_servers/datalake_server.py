#!/usr/bin/env python3
# MCP STDIO stub for Data Lake / Hive queries
import json, sys, asyncio

def get_secret(vref): return '<secret:%s>'%vref

async def handle_request(req_json):
    req = json.loads(req_json)
    q = req.get('query','select 1')
    # Simulate a batch response
    return json.dumps({'rows':[{'ts':'2025-01-01','value':100}], 'query': q})

async def stdin_loop():
    for line in sys.stdin:
        if not line.strip(): continue
        out = await handle_request(line.strip())
        print(out, flush=True)

if __name__ == '__main__':
    asyncio.run(stdin_loop())
