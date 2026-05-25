import json
import os
import time
from typing import Dict, Any, List

import boto3
import requests


TRAINING_SECRET_ARN = os.environ.get("TRAINING_SECRET_ARN", "")
TRAINING_BASE_URL = os.environ.get("TRAINING_BASE_URL", "")


def get_training_secret() -> Dict[str, Any]:
    sm = boto3.client("secretsmanager")
    val = sm.get_secret_value(SecretId=TRAINING_SECRET_ARN)
    return json.loads(val.get("SecretString") or "{}")


def fetch_training_completions(module_name: str) -> List[Dict[str, Any]]:
    if not TRAINING_BASE_URL:
        raise RuntimeError("Missing TRAINING_BASE_URL")
    secret = get_training_secret()
    token = secret.get("token") or secret.get("apiToken")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    url = TRAINING_BASE_URL.rstrip("/") + "/api/grc/completions"
    params = {"module": module_name}
    r = requests.get(url, headers=headers, params=params, timeout=30)
    if r.status_code >= 400:
        raise requests.HTTPError(f"{r.status_code} {r.text}")
    data = r.json() or []
    results: List[Dict[str, Any]] = []
    for row in data:
        results.append({
            "email": row.get("email"),
            "completedAt": row.get("completedAt"),
        })
    return results


def make_response(status: str, items: List[Dict[str, Any]], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": len(items), "items": items},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "training"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = (event or {}).get("correlationId", "")
    params = (event or {}).get("params", {}) or {}
    module_name = params.get("module") or "Annual Security Training 2025"
    try:
        items = fetch_training_completions(module_name)
        return make_response("SUCCESS", items, correlation_id, start=start)
    except requests.HTTPError as e:
        return make_response("FAILURE", [], correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
    except Exception as e:
        return make_response("FAILURE", [], correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

