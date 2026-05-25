import json
import os
import time
from typing import Dict, Any, List

import boto3
import requests
from botocore.exceptions import ClientError


WORKDAY_SECRET_ARN = os.environ.get("WORKDAY_SECRET_ARN", "")


def get_workday_secret() -> Dict[str, Any]:
    if not WORKDAY_SECRET_ARN:
        raise RuntimeError("Missing WORKDAY_SECRET_ARN env var")
    sm = boto3.client("secretsmanager")
    try:
        val = sm.get_secret_value(SecretId=WORKDAY_SECRET_ARN)
    except ClientError as e:
        raise RuntimeError(f"Failed to get Workday secret: {e}")
    return json.loads(val.get("SecretString") or "{}")


def fetch_active_employees(base_url: str, auth_type: str, token: str, username: str = "", password: str = "") -> List[Dict[str, Any]]:
    url = base_url.rstrip("/") + "/api/grc/active"
    headers = {"Accept": "application/json"}
    auth = None
    if auth_type == "bearer":
        headers["Authorization"] = f"Bearer {token}"
    elif auth_type == "basic":
        auth = (username, password)
    else:
        raise RuntimeError("Unsupported Workday auth_type; expected 'bearer' or 'basic'")
    r = requests.get(url, headers=headers, timeout=30, auth=auth)
    if r.status_code >= 400:
        raise requests.HTTPError(f"{r.status_code} {r.text}")
    data = r.json() if r.text else []
    items: List[Dict[str, Any]] = []
    for e in data:
        items.append({
            "employeeId": e.get("employeeId"),
            "email": e.get("email"),
            "managerEmail": e.get("managerEmail"),
        })
    return items


def make_response(status: str, items: List[Dict[str, Any]], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": len(items), "items": items},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "workday"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = event.get("correlationId", "")
    try:
        secret = get_workday_secret()
        base_url = secret.get("baseUrl")
        if not base_url:
            raise RuntimeError("Workday secret missing 'baseUrl'")
        if "bearer" in secret:
            items = fetch_active_employees(base_url, "bearer", token=secret["bearer"])
        else:
            items = fetch_active_employees(base_url, "basic", token="", username=secret.get("username", ""), password=secret.get("password", ""))
        return make_response("SUCCESS", items, correlation_id, start=start)
    except requests.HTTPError as e:
        return make_response("FAILURE", [], correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
    except Exception as e:
        return make_response("FAILURE", [], correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

