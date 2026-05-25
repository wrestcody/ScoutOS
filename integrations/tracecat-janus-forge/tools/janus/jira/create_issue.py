import os
from typing import Any, Dict

import requests
from requests.auth import HTTPBasicAuth


def create_issue(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.jira.create_issue.create_issue

    Inputs:
      - projectKey: str
      - summary: str
      - description: str
      - issueType: str (default 'Task')

    Secrets via env:
      - JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
    """
    base = os.getenv("JIRA_BASE_URL")
    email = os.getenv("JIRA_EMAIL")
    token = os.getenv("JIRA_API_TOKEN")
    if not all([base, email, token]):
        return {"status": "failure", "message": "JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN not set"}

    project_key = event.get("projectKey")
    summary = event.get("summary")
    description = event.get("description")
    issue_type = event.get("issueType", "Task")
    if not all([project_key, summary, description]):
        return {"status": "failure", "message": "projectKey, summary, description required"}

    auth = HTTPBasicAuth(email, token)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": description,
            "issuetype": {"name": issue_type}
        }
    }
    resp = requests.post(f"{base}/rest/api/3/issue", headers=headers, auth=auth, json=payload, timeout=30)
    if resp.status_code not in (200, 201):
        return {"status": "failure", "message": f"jira {resp.status_code} {resp.text}"}
    return {"status": "success", "issue": resp.json()}

