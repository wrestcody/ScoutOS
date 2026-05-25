import os
from typing import Any, Dict

import requests
from requests.auth import HTTPBasicAuth


def get_config(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.jira.get_config.get_config

    Secrets via env:
      - JIRA_BASE_URL (https://your-domain.atlassian.net)
      - JIRA_EMAIL
      - JIRA_API_TOKEN
    """
    base = os.getenv("JIRA_BASE_URL")
    email = os.getenv("JIRA_EMAIL")
    token = os.getenv("JIRA_API_TOKEN")
    if not all([base, email, token]):
        return {"status": "failure", "message": "JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN not set"}
    auth = HTTPBasicAuth(email, token)
    headers = {"Accept": "application/json"}
    try:
        proj = requests.get(f"{base}/rest/api/3/project/search", headers=headers, auth=auth, timeout=30)
        perms = requests.get(f"{base}/rest/api/3/permissionscheme", headers=headers, auth=auth, timeout=30)
        wf = requests.get(f"{base}/rest/api/3/workflowscheme", headers=headers, auth=auth, timeout=30)
        if proj.status_code != 200:
            return {"status": "failure", "message": f"projects {proj.status_code} {proj.text}"}
        return {
            "status": "success",
            "config": {
                "projects": proj.json(),
                "permissionSchemes": perms.json() if perms.status_code == 200 else {"error": perms.text},
                "workflowSchemes": wf.json() if wf.status_code == 200 else {"error": wf.text},
            },
        }
    except Exception as e:
        return {"status": "failure", "message": str(e)}

