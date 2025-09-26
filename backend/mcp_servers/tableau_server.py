#!/usr/bin/env python3
# MCP STDIO stub for Tableau publishing
import json, sys, asyncio
def get_secret(vref): return '<secret:%s>'%vref

async def handle_request(req_json):
    req = json.loads(req_json)
    # Expecting {'action':'publish','data':[...]}
    action = req.get('action')
    if action == 'publish':
        workbook = req.get('workbook','default')
        return json.dumps({'status':'published','workbook':workbook,'url':f'https://tableau.example.com/{workbook}'})
    return json.dumps({'error':'unknown action'})

async def stdin_loop():
    for line in sys.stdin:
        if not line.strip(): continue
        print(await handle_request(line.strip()), flush=True)

if __name__ == '__main__':
    asyncio.run(stdin_loop())
