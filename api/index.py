from backend.api import app

# Vercel needs the app object to be exposed precisely.
# By importing from backend.api, we use the existing Flask configuration.
# The `vercel.json` rewrite will point /api/* to this file.
