import json
import os
import time
from typing import Dict, Any

import boto3
import requests


OKTA_TOKEN_SECRET_ARN = os.environ.get("OKTA_TOKEN_SECRET_ARN", "")
OKTA_ORG = os.environ.get("OKTA_ORG", "")


def get_okta_token() -> str:
    if not OKTA_TOKEN_SECRET_ARN:
        raise RuntimeError("Missing OKTA_TOKEN_SECRET_ARN env var")
    sm = boto3.client("secretsmanager")
    val = sm.get_secret_value(SecretId=OKTA_TOKEN_SECRET_ARN)
    data = json.loads(val.get("SecretString") or "{}")
    token = data.get("token") or data.get("apiToken")
    if not token:
        raise RuntimeError("Okta token not found in secret")
    return token


def check_okta(email: str) -> Dict[str, Any]:
    if not OKTA_ORG:
        raise RuntimeError("Missing OKTA_ORG env var")
    token = get_okta_token()
    headers = {"Authorization": f"SSWS {token}", "Accept": "application/json"}
    url = f"https://{OKTA_ORG}/api/v1/users/{email}"
    r = requests.get(url, headers=headers, timeout=30)
    if r.status_code == 404:
        return {"provider": "okta", "user": email, "active": False}
    if r.status_code >= 400:
        raise requests.HTTPError(f"{r.status_code} {r.text}")
    body = r.json()
    status = body.get("status")
    return {"provider": "okta", "user": email, "active": status in ("ACTIVE", "PROVISIONED")}


def check_aws_iam(user_name: str) -> Dict[str, Any]:
    iam = boto3.client("iam")
    try:
        iam.get_user(UserName=user_name)
        return {"provider": "aws-iam", "user": user_name, "active": True}
    except iam.exceptions.NoSuchEntityException:
        return {"provider": "aws-iam", "user": user_name, "active": False}


def make_response(status: str, item: Dict[str, Any], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": 1 if item else 0, "items": [item] if item else []},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": item.get("provider") if item else ""},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = event.get("correlationId", "")
    params = event.get("params", {}) or {}
    try:
        if params.get("provider") == "okta":
            email = params.get("email")
            if not email:
                raise RuntimeError("Missing 'email' for Okta check")
            item = check_okta(email)
        elif params.get("provider") == "aws":
            user_name = params.get("userName")
            if not user_name:
                raise RuntimeError("Missing 'userName' for AWS IAM check")
            item = check_aws_iam(user_name)
        else:
            raise RuntimeError("Unsupported provider; expected 'okta' or 'aws'")
        return make_response("SUCCESS", item, correlation_id, start=start)
    except requests.HTTPError as e:
        return make_response("FAILURE", {}, correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
    except Exception as e:
        return make_response("FAILURE", {}, correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

