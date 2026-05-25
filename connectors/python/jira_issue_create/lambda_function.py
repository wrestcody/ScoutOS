import json
import os
import time
from typing import Dict, Any

import boto3
import requests
from botocore.exceptions import ClientError


JIRA_SECRET_ARN = os.environ.get("JIRA_SECRET_ARN", "")
JIRA_BASE_URL = os.environ.get("JIRA_BASE_URL", "")


def get_jira_auth() -> Dict[str, str]:
    if not JIRA_SECRET_ARN:
        raise RuntimeError("Missing JIRA_SECRET_ARN env var")
    secrets = boto3.client("secretsmanager")
    try:
        val = secrets.get_secret_value(SecretId=JIRA_SECRET_ARN)
    except ClientError as e:
        raise RuntimeError(f"Failed to get Jira secret: {e}")
    data = json.loads(val.get("SecretString") or "{}")
    # Support either basic auth (email/apiToken) or bearer token
    email = data.get("email") or data.get("username")
    api_token = data.get("apiToken") or data.get("token")
    bearer = data.get("bearer")
    if bearer:
        return {"auth_type": "bearer", "token": bearer}
    if email and api_token:
        return {"auth_type": "basic", "email": email, "token": api_token}
    raise RuntimeError("Jira secret must include either 'bearer' or 'email'+'apiToken'")


def create_issue(params: Dict[str, Any]) -> Dict[str, Any]:
    if not JIRA_BASE_URL:
        raise RuntimeError("Missing JIRA_BASE_URL env var (e.g., https://yourdomain.atlassian.net)")
    auth = get_jira_auth()
    project_key = params.get("projectKey")
    summary = params.get("summary")
    description = params.get("description") or "Created by Genesys GRC Engine"
    issue_type = params.get("issueType") or "Task"

    if not project_key or not summary:
        raise RuntimeError("'projectKey' and 'summary' are required in params")

    url = JIRA_BASE_URL.rstrip("/") + "/rest/api/3/issue"
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": description,
            "issuetype": {"name": issue_type},
        }
    }

    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if auth["auth_type"] == "bearer":
        headers["Authorization"] = f"Bearer {auth['token']}"
        response = requests.post(url, headers=headers, json=payload, timeout=30)
    else:
        response = requests.post(url, headers=headers, json=payload, timeout=30, auth=(auth["email"], auth["token"]))

    if response.status_code >= 400:
        raise requests.HTTPError(f"{response.status_code} {response.text}")
    return response.json()


def make_response(status: str, evidence: Dict[str, Any], correlation_id: str, error_code: str = "", error_message: str = "", start_time: float = 0.0) -> Dict[str, Any]:
    duration_ms = int((time.time() - start_time) * 1000) if start_time else 0
    return {
        "status": status,
        "evidence": {"count": 1 if evidence else 0, "items": [evidence] if evidence else []},
        "timingMs": duration_ms,
        "meta": {"provider": "jira"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = event.get("correlationId", "")
    params = event.get("params", {}) or {}
    try:
        result = create_issue(params)
        key = result.get("key")
        issue_url = JIRA_BASE_URL.rstrip("/") + "/browse/" + key if key else ""
        evidence = {"issueKey": key, "url": issue_url}
        return make_response("SUCCESS", evidence, correlation_id, start_time=start)
    except requests.HTTPError as e:
        return make_response("FAILURE", {}, correlation_id, error_code="HTTP_ERROR", error_message=str(e), start_time=start)
    except Exception as e:
        return make_response("FAILURE", {}, correlation_id, error_code="UNEXPECTED", error_message=str(e), start_time=start)

