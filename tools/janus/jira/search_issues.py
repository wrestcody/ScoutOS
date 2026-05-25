import os
from typing import Any, Dict

import requests
from requests.auth import HTTPBasicAuth


def search_issues(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.jira.search_issues.search_issues

    Inputs:
      - jql: str
      - maxResults: int (default 50)

    Secrets via env:
      - JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
    """
    base = os.getenv("JIRA_BASE_URL")
    email = os.getenv("JIRA_EMAIL")
    token = os.getenv("JIRA_API_TOKEN")
    if not all([base, email, token]):
        return {"status": "failure", "message": "JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN not set"}
    jql = event.get("jql")
    max_results = int(event.get("maxResults", 50))
    if not jql:
        return {"status": "failure", "message": "jql required"}

    auth = HTTPBasicAuth(email, token)
    headers = {"Accept": "application/json"}
    resp = requests.get(
        f"{base}/rest/api/3/search",
        headers=headers,
        auth=auth,
        params={"jql": jql, "maxResults": max_results},
        timeout=30,
    )
    if resp.status_code != 200:
        return {"status": "failure", "message": f"jira {resp.status_code} {resp.text}"}
    return {"status": "success", "result": resp.json()}

