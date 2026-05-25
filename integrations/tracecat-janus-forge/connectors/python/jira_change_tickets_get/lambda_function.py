import json
import os
import time
from typing import Dict, Any, List

import boto3
import requests


JIRA_SECRET_ARN = os.environ.get("JIRA_SECRET_ARN", "")
JIRA_BASE_URL = os.environ.get("JIRA_BASE_URL", "")


def get_jira_auth() -> Dict[str, str]:
    sm = boto3.client("secretsmanager")
    val = sm.get_secret_value(SecretId=JIRA_SECRET_ARN)
    data = json.loads(val.get("SecretString") or "{}")
    email = data.get("email") or data.get("username")
    api_token = data.get("apiToken") or data.get("token")
    bearer = data.get("bearer")
    if bearer:
        return {"auth_type": "bearer", "token": bearer}
    if email and api_token:
        return {"auth_type": "basic", "email": email, "token": api_token}
    raise RuntimeError("Jira secret must include either 'bearer' or 'email'+'apiToken'")


def search_jira(jql: str) -> List[Dict[str, Any]]:
    if not JIRA_BASE_URL:
        raise RuntimeError("Missing JIRA_BASE_URL")
    auth = get_jira_auth()
    url = JIRA_BASE_URL.rstrip("/") + "/rest/api/3/search"
    headers = {"Accept": "application/json"}
    params = {"jql": jql, "maxResults": 100}
    if auth["auth_type"] == "bearer":
        headers["Authorization"] = f"Bearer {auth['token']}"
        r = requests.get(url, headers=headers, params=params, timeout=30)
    else:
        r = requests.get(url, headers=headers, params=params, timeout=30, auth=(auth["email"], auth["token"]))
    if r.status_code >= 400:
        raise requests.HTTPError(f"{r.status_code} {r.text}")
    data = r.json() or {}
    issues = data.get("issues", [])
    results: List[Dict[str, Any]] = []
    for i in issues:
        fields = i.get("fields", {})
        results.append({
            "key": i.get("key"),
            "summary": fields.get("summary"),
            "status": (fields.get("status") or {}).get("name"),
            "created": fields.get("created"),
            "updated": fields.get("updated"),
        })
    return results


def make_response(status: str, items: List[Dict[str, Any]], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": len(items), "items": items},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "jira"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = (event or {}).get("correlationId", "")
    params = (event or {}).get("params", {}) or {}
    jql = params.get("jql") or "project=GRC AND type=\"Production Change\" AND status=Done AND updated >= -7d"
    try:
        items = search_jira(jql)
        return make_response("SUCCESS", items, correlation_id, start=start)
    except requests.HTTPError as e:
        return make_response("FAILURE", [], correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
    except Exception as e:
        return make_response("FAILURE", [], correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

