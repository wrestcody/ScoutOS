import json
import os
import time
from typing import Dict, Any

import boto3
import requests
from botocore.exceptions import ClientError


VENDOR_SCORE_SECRET_ARN = os.environ.get("VENDOR_SCORE_SECRET_ARN", "")
VENDOR_SCORE_PROVIDER = os.environ.get("VENDOR_SCORE_PROVIDER", "securityscorecard")


def get_provider_secret() -> Dict[str, Any]:
    if not VENDOR_SCORE_SECRET_ARN:
        raise RuntimeError("Missing VENDOR_SCORE_SECRET_ARN env var")
    sm = boto3.client("secretsmanager")
    try:
        val = sm.get_secret_value(SecretId=VENDOR_SCORE_SECRET_ARN)
    except ClientError as e:
        raise RuntimeError(f"Failed to get vendor score secret: {e}")
    return json.loads(val.get("SecretString") or "{}")


def fetch_score(domain: str) -> Dict[str, Any]:
    secret = get_provider_secret()
    provider = VENDOR_SCORE_PROVIDER.lower()
    if provider == "securityscorecard":
        token = secret.get("token") or secret.get("apiToken")
        if not token:
            raise RuntimeError("Missing token in vendor score secret")
        headers = {
            "Authorization": f"Token token={token}",
            "Accept": "application/json",
        }
        url = f"https://api.securityscorecard.io/companies/{domain}"
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code >= 400:
            raise requests.HTTPError(f"{r.status_code} {r.text}")
        data = r.json()
        return {
            "provider": "securityscorecard",
            "domain": domain,
            "score": data.get("score"),
            "grade": data.get("grade"),
        }
    elif provider == "upguard":
        # Example UpGuard style; adjust to your API keys and endpoints
        token = secret.get("token") or secret.get("apiToken")
        if not token:
            raise RuntimeError("Missing token in vendor score secret")
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        url = f"https://api.upguard.com/v2/companies/{domain}"
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code >= 400:
            raise requests.HTTPError(f"{r.status_code} {r.text}")
        data = r.json()
        return {
            "provider": "upguard",
            "domain": domain,
            "score": data.get("score"),
            "grade": data.get("grade"),
        }
    else:
        raise RuntimeError(f"Unsupported provider: {VENDOR_SCORE_PROVIDER}")


def response(status: str, items: Any, correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": len(items) if isinstance(items, list) else (1 if items else 0), "items": items if isinstance(items, list) else ([items] if items else [])},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": VENDOR_SCORE_PROVIDER},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = event.get("correlationId", "")
    params = event.get("params", {}) or {}
    domain = params.get("domain")
    try:
        if not domain:
            raise RuntimeError("Missing 'domain' in params")
        item = fetch_score(domain)
        return response("SUCCESS", item, correlation_id, start=start)
    except requests.HTTPError as e:
        return response("FAILURE", [], correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
    except Exception as e:
        return response("FAILURE", [], correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

