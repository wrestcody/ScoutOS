import json
import os
import time
from typing import Dict, Any, List

import boto3
import requests


GC_OAUTH_SECRET_ARN = os.environ.get("GC_OAUTH_SECRET_ARN", "")
GC_REGION = os.environ.get("GC_REGION", "us-east-1")
GC_LOGIN_URL = os.environ.get("GC_LOGIN_URL", "")


def get_gc_oauth() -> Dict[str, str]:
    sm = boto3.client("secretsmanager")
    val = sm.get_secret_value(SecretId=GC_OAUTH_SECRET_ARN)
    data = json.loads(val.get("SecretString") or "{}")
    return {
        "client_id": data.get("clientId"),
        "client_secret": data.get("clientSecret"),
    }


def gc_api_base() -> str:
    return f"https://api.{GC_REGION}.pure.cloud"

def gc_login_base() -> str:
    # Prefer explicit override; fallback to region-mapped login host
    if GC_LOGIN_URL:
        return GC_LOGIN_URL.rstrip("/")
    return f"https://login.{GC_REGION}.pure.cloud"


def gc_token() -> str:
    oauth = get_gc_oauth()
    url = gc_login_base() + "/oauth/token"
    r = requests.post(url, data={"grant_type": "client_credentials"}, auth=(oauth["client_id"], oauth["client_secret"]))
    if r.status_code >= 400:
        raise requests.HTTPError(f"GC OAuth error: {r.status_code} {r.text}")
    return r.json().get("access_token")


def get_admin_role_id(token: str) -> str:
    url = gc_api_base() + "/api/v2/authorization/roles?pageSize=100"
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(url, headers=headers, timeout=30)
    if r.status_code >= 400:
        raise requests.HTTPError(f"{r.status_code} {r.text}")
    for role in r.json().get("entities", []):
        if role.get("name", "").lower() == "admin":
            return role.get("id")
    raise RuntimeError("Admin role not found")


def list_users_with_role(token: str, role_id: str) -> List[Dict[str, Any]]:
    url = gc_api_base() + f"/api/v2/authorization/roles/{role_id}/users?pageSize=200"
    headers = {"Authorization": f"Bearer {token}"}
    users: List[Dict[str, Any]] = []
    page = 1
    while True:
        r = requests.get(url + f"&pageNumber={page}", headers=headers, timeout=30)
        if r.status_code >= 400:
            raise requests.HTTPError(f"{r.status_code} {r.text}")
        data = r.json() or {}
        entities = data.get("entities", [])
        for u in entities:
            users.append({"id": u.get("id"), "name": u.get("name"), "email": (u.get("emails") or [None])[0]})
        if not data.get("nextUri"):
            break
        page += 1
    return users


def make_response(status: str, items: List[Dict[str, Any]], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": len(items), "items": items},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "genesys-cloud"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = (event or {}).get("correlationId", "")
    try:
        token = gc_token()
        role_id = get_admin_role_id(token)
        users = list_users_with_role(token, role_id)
        return make_response("SUCCESS", users, correlation_id, start=start)
    except requests.HTTPError as e:
        return make_response("FAILURE", [], correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
    except Exception as e:
        return make_response("FAILURE", [], correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

