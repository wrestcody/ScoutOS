import json
import os
import time
from typing import Dict, Any

import boto3
import requests
from botocore.exceptions import ClientError


ATTEST_WEBHOOK_SECRET_ARN = os.environ.get("ATTEST_WEBHOOK_SECRET_ARN", "")
ATTEST_WEBHOOK_URL = os.environ.get("ATTEST_WEBHOOK_URL", "")


def get_webhook_url() -> str:
    if ATTEST_WEBHOOK_SECRET_ARN:
        sm = boto3.client("secretsmanager")
        try:
            val = sm.get_secret_value(SecretId=ATTEST_WEBHOOK_SECRET_ARN)
        except ClientError as e:
            raise RuntimeError(f"Failed to get attestation webhook secret: {e}")
        data = json.loads(val.get("SecretString") or "{}")
        url = data.get("url")
        if not url:
            raise RuntimeError("Attestation webhook secret missing 'url'")
        return url
    if not ATTEST_WEBHOOK_URL:
        raise RuntimeError("Missing ATTEST_WEBHOOK_URL or ATTEST_WEBHOOK_SECRET_ARN")
    return ATTEST_WEBHOOK_URL


def post_attestation(url: str, record: Dict[str, Any]) -> Dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    r = requests.post(url, headers=headers, json=record, timeout=30)
    if r.status_code >= 400:
        raise requests.HTTPError(f"{r.status_code} {r.text}")
    return {"statusCode": r.status_code}


def response(status: str, evidence: Dict[str, Any], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": 1 if evidence else 0, "items": [evidence] if evidence else []},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "policy-attestation"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = event.get("correlationId", "")
    params = event.get("params", {}) or {}
    try:
        url = get_webhook_url()
        record = params.get("record") or {}
        result = post_attestation(url, record)
        return response("SUCCESS", {"posted": True, "providerStatus": result.get("statusCode")}, correlation_id, start=start)
    except requests.HTTPError as e:
        return response("FAILURE", {}, correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
    except Exception as e:
        return response("FAILURE", {}, correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

