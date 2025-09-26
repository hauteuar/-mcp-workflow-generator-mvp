import json, os

class WorkflowRegistry:
    def __init__(self, path='backend/settings.json'):
        self.path = path
        if not os.path.exists(path):
            with open(path, 'w') as f:
                json.dump({'mcp_registry': []}, f, indent=2)

    def add_entry(self, entry: dict):
        data = self._read()
        data['mcp_registry'].append(entry)
        self._write(data)

    def list_entries(self):
        data = self._read()
        return data.get('mcp_registry', [])

    def _read(self):
        with open(self.path) as f:
            return json.load(f)

    def _write(self, data):
        with open(self.path, 'w') as f:
            json.dump(data, f, indent=2)
