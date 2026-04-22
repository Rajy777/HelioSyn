import os
import sys
from wsgiref.simple_server import make_server
import importlib.util

# Put the root directory in the Python path so modules can find backend.*
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_dir)

# Load api/index.py explicitly to avoid collision with this file's name (api.py)
api_index_path = os.path.join(root_dir, 'api', 'index.py')
spec = importlib.util.spec_from_file_location("api_index", api_index_path)
api_index = importlib.util.module_from_spec(spec)
sys.modules["api_index"] = api_index
spec.loader.exec_module(api_index)

handler = api_index.handler

if __name__ == '__main__':
    port = 5000
    print(f"Starting HelioSyn Native API on http://localhost:{port}")
    
    with make_server('', port, handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
