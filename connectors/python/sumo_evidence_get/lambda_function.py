import base64
import json
import os
import time
from typing import Dict, Any

import boto3
import requests


BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
SUMO_SECRET_ARN = os.environ.get("SUMO_SECRET_ARN", "")
SUMO_BASE_URL = os.environ.get("SUMO_BASE_URL", "")
DEFAULT_SOURCE_CATEGORY = os.environ.get("SUMO_SOURCE_CATEGORY", "genesys-cloud-logs")


def get_sumo_secret() -> Dict[str, str]:
    if not SUMO_SECRET_ARN:
        raise RuntimeError("Missing SUMO_SECRET_ARN env var")
    sm = boto3.client("secretsmanager")
    val = sm.get_secret_value(SecretId=SUMO_SECRET_ARN)
    data = json.loads(val.get("SecretString") or "{}")
    # Expect {"accessId":"...","accessKey":"..."}
    return data


def bedrock_generate_query(nl_request: str, source_category: str) -> str:
    client = boto3.client("bedrock-runtime")
    prompt = (
        "You are an expert in Sumo Logic Search Query Language. "
        "Given the user's request, generate the exact Sumo search query. "
        f"Assume logs are in source category '{source_category}'. "
        "Return only the query, no extra text.\n\nUser Request: " + nl_request
    )
    # Use Claude Messages API format
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 512,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    resp = client.invoke_model(modelId=BEDROCK_MODEL_ID, body=json.dumps(body))
    payload = json.loads(resp.get("body").read().decode("utf-8"))
    # Claude returns list of content blocks
    text = ""
    for c in payload.get("content", []):
        if c.get("type") == "text":
            text += c.get("text", "")
    return text.strip()


def sumo_basic_auth_header(access_id: str, access_key: str) -> str:
    token = f"{access_id}:{access_key}".encode("utf-8")
    return "Basic " + base64.b64encode(token).decode("utf-8")


def sumo_create_job(base_url: str, auth_header: str, query: str, from_ms: int, to_ms: int) -> str:
    url = base_url.rstrip("/") + "/api/v1/search/jobs"
    headers = {"Authorization": auth_header, "Content-Type": "application/json", "Accept": "application/json"}
    body = {"query": query, "from": from_ms, "to": to_ms, "timeZone": "UTC"}
    r = requests.post(url, headers=headers, json=body, timeout=30)
    if r.status_code >= 400:
        raise requests.HTTPError(f"Sumo create job error: {r.status_code} {r.text}")
    return r.json().get("id")


def sumo_poll_job(base_url: str, auth_header: str, job_id: str, timeout_s: int = 180, interval_s: int = 3) -> Dict[str, Any]:
    url = base_url.rstrip("/") + f"/api/v1/search/jobs/{job_id}"
    headers = {"Authorization": auth_header, "Accept": "application/json"}
    end = time.time() + timeout_s
    while time.time() < end:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code >= 400:
            raise requests.HTTPError(f"Sumo poll job error: {r.status_code} {r.text}")
        body = r.json() or {}
        state = (body.get("state") or "").upper()
        if state in ("DONE GATHERING RESULTS", "CANCELLED", "FAILED"):
            return body
        time.sleep(interval_s)
    raise TimeoutError("Sumo job did not complete in time")


def sumo_get_messages(base_url: str, auth_header: str, job_id: str, limit: int = 200) -> Dict[str, Any]:
    url = base_url.rstrip("/") + f"/api/v1/search/jobs/{job_id}/messages?limit={limit}"
    headers = {"Authorization": auth_header, "Accept": "application/json"}
    r = requests.get(url, headers=headers, timeout=30)
    if r.status_code >= 400:
        raise requests.HTTPError(f"Sumo get messages error: {r.status_code} {r.text}")
    return r.json() or {}


def ms_since(days: int) -> int:
    return int((time.time() - days * 86400) * 1000)


def make_response(status: str, result: Dict[str, Any], correlation_id: str, query: str = "", error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    meta = {"provider": "sumologic", "query": query}
    return {
        "status": status,
        "evidence": {"count": 1 if result else 0, "items": [result] if result else []},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": meta,
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = (event or {}).get("correlationId", "")
    params = (event or {}).get("params", {}) or {}
    nl_request = params.get("naturalLanguageRequest") or ""
    source_category = params.get("sourceCategory") or DEFAULT_SOURCE_CATEGORY
    lookback_days = int(params.get("lookbackDays") or 30)
    try:
        if not nl_request:
            raise RuntimeError("Missing 'naturalLanguageRequest' in params")
        if not SUMO_BASE_URL:
            raise RuntimeError("Missing SUMO_BASE_URL env var")
        creds = get_sumo_secret()
        auth_header = sumo_basic_auth_header(creds.get("accessId", ""), creds.get("accessKey", ""))
        query = bedrock_generate_query(nl_request, source_category)
        # Ensure source category is present
        if "_sourceCategory=" not in query:
            query = f"_sourceCategory={source_category} " + query
        job_id = sumo_create_job(SUMO_BASE_URL, auth_header, query, ms_since(lookback_days), int(time.time() * 1000))
        status = sumo_poll_job(SUMO_BASE_URL, auth_header, job_id)
        if (status.get("state") or "").upper() != "DONE GATHERING RESULTS":
            raise RuntimeError(f"Sumo job not successful: {json.dumps(status)}")
        messages = sumo_get_messages(SUMO_BASE_URL, auth_header, job_id)
        return make_response("SUCCESS", {"jobId": job_id, "messages": messages}, correlation_id, query=query, start=start)
    except requests.HTTPError as e:
        return make_response("FAILURE", {}, correlation_id, query="", error_code="HTTP_ERROR", error_message=str(e), start=start)
    except Exception as e:
        return make_response("FAILURE", {}, correlation_id, query="", error_code="UNEXPECTED", error_message=str(e), start=start)

