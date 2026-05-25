import json
import os
import time
from typing import List, Dict, Any

import boto3
import requests
from botocore.exceptions import ClientError


OKTA_TOKEN_SECRET_ARN = os.environ.get("OKTA_TOKEN_SECRET_ARN", "")
DEFAULT_OKTA_ORG = os.environ.get("OKTA_ORG", "")


def get_okta_token() -> str:
    secrets = boto3.client("secretsmanager")
    secret_id = OKTA_TOKEN_SECRET_ARN
    if not secret_id:
        raise RuntimeError("Missing OKTA_TOKEN_SECRET_ARN env var")
    try:
        val = secrets.get_secret_value(SecretId=secret_id)
    except ClientError as e:
        raise RuntimeError(f"Failed to get Okta token secret: {e}")
    payload = val.get("SecretString") or "{}"
    data = json.loads(payload)
    token = data.get("token") or data.get("apiToken")
    if not token:
        raise RuntimeError("Okta token not found in secret (expected 'token' or 'apiToken')")
    return token


def list_okta_admins(okta_org: str, token: str, max_pages: int = 20) -> List[str]:
    if not okta_org:
        raise RuntimeError("Missing oktaOrg parameter or OKTA_ORG env var")
    base = f"https://{okta_org}"
    # Query for admin users; adjust if your org uses role assignments via different endpoints.
    url = base + "/api/v1/users?search=profile.admin%20eq%20%5C"true%5C"&limit=200"
    headers = {"Authorization": f"SSWS {token}", "Accept": "application/json"}

    admins: List[str] = []
    next_url = url
    for _ in range(max_pages):
        resp = requests.get(next_url, headers=headers, timeout=30)
        if resp.status_code >= 400:
            raise requests.HTTPError(f"{resp.status_code} {resp.text}")
        users = resp.json() if resp.text else []
        admins.extend([u.get("profile", {}).get("email") for u in users if u.get("profile")])
        # pagination via Link headers
        if "next" in resp.links:
            next_url = resp.links["next"]["url"]
        else:
            break
    # de-duplicate while preserving order
    seen = set()
    unique = []
    for email in admins:
        if email and email not in seen:
            seen.add(email)
            unique.append(email)
    return unique


def make_response(status: str, evidence_items: List[Any], correlation_id: str, provider_meta: Dict[str, Any], error_code: str = "", error_message: str = "", start_time: float = 0.0) -> Dict[str, Any]:
    duration_ms = int((time.time() - start_time) * 1000) if start_time else 0
    return {
        "status": status,
        "evidence": {"count": len(evidence_items), "items": evidence_items},
        "timingMs": duration_ms,
        "meta": provider_meta,
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = event.get("correlationId", "")
    params = event.get("params", {}) or {}
    okta_org = params.get("oktaOrg") or DEFAULT_OKTA_ORG

    try:
        token = get_okta_token()
        admins = list_okta_admins(okta_org, token)
        return make_response(
            status="SUCCESS",
            evidence_items=admins,
            correlation_id=correlation_id,
            provider_meta={"provider": "okta", "org": okta_org},
            start_time=start,
        )
    except requests.HTTPError as e:
        return make_response(
            status="FAILURE",
            evidence_items=[],
            correlation_id=correlation_id,
            provider_meta={"provider": "okta", "org": okta_org},
            error_code="HTTP_ERROR",
            error_message=str(e),
            start_time=start,
        )
    except Exception as e:  # catch-all to avoid Lambda erroring out
        return make_response(
            status="FAILURE",
            evidence_items=[],
            correlation_id=correlation_id,
            provider_meta={"provider": "okta", "org": okta_org},
            error_code="UNEXPECTED",
            error_message=str(e),
            start_time=start,
        )

