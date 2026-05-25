import json
import os
import time
from typing import Dict, Any

import boto3
import requests


# ForgeTool-VendorLedger: Exports External Contacts via Bulk Export and uploads CSV to evidence locker (S3)
# Security: Secrets held in Secrets Manager; least-privilege IAM; no secrets in logs

GC_OAUTH_SECRET_ARN = os.environ.get("GC_OAUTH_SECRET_ARN", "")
GC_REGION = os.environ.get("GC_REGION", "us-east-1")
GC_LOGIN_URL = os.environ.get("GC_LOGIN_URL", "")
EVIDENCE_S3_BUCKET = os.environ.get("EVIDENCE_S3_BUCKET", "")
EVIDENCE_S3_PREFIX = os.environ.get("EVIDENCE_S3_PREFIX", "vendor-ledger/")
GC_BULK_EXPORT_BASE = os.environ.get("GC_BULK_EXPORT_BASE", "")


def gc_login_base() -> str:
  if GC_LOGIN_URL:
    return GC_LOGIN_URL.rstrip("/")
  return f"https://login.{GC_REGION}.pure.cloud"


def get_gc_oauth() -> Dict[str, str]:
  sm = boto3.client("secretsmanager")
  val = sm.get_secret_value(SecretId=GC_OAUTH_SECRET_ARN)
  data = json.loads(val.get("SecretString") or "{}")
  return {"client_id": data.get("clientId"), "client_secret": data.get("clientSecret")}


def gc_token() -> str:
  oauth = get_gc_oauth()
  url = gc_login_base() + "/oauth/token"
  r = requests.post(url, data={"grant_type": "client_credentials"}, auth=(oauth["client_id"], oauth["client_secret"]))
  if r.status_code >= 400:
    raise requests.HTTPError(f"GC OAuth error: {r.status_code} {r.text}")
  return r.json().get("access_token")


def start_bulk_export(token: str) -> str:
  if not GC_BULK_EXPORT_BASE:
    raise RuntimeError("Missing GC_BULK_EXPORT_BASE (Bulk Export base URL)")
  headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
  payload = {"entityType": "externalContacts", "format": "csv"}
  r = requests.post(GC_BULK_EXPORT_BASE + "/jobs", headers=headers, json=payload, timeout=30)
  if r.status_code >= 400:
    raise requests.HTTPError(f"Start bulk export error: {r.status_code} {r.text}")
  job = r.json() or {}
  return job.get("id")


def poll_bulk_export(token: str, job_id: str, timeout_s: int = 300, interval_s: int = 5) -> Dict[str, Any]:
  headers = {"Authorization": f"Bearer {token}"}
  url = GC_BULK_EXPORT_BASE + f"/jobs/{job_id}"
  end = time.time() + timeout_s
  while time.time() < end:
    r = requests.get(url, headers=headers, timeout=15)
    if r.status_code >= 400:
      raise requests.HTTPError(f"Poll bulk export error: {r.status_code} {r.text}")
    body = r.json() or {}
    if body.get("status") in ("completed", "failed"):
      return body
    time.sleep(interval_s)
  raise TimeoutError("Bulk export did not complete in time")


def download_export(token: str, download_url: str) -> bytes:
  headers = {"Authorization": f"Bearer {token}"}
  r = requests.get(download_url, headers=headers, timeout=60)
  if r.status_code >= 400:
    raise requests.HTTPError(f"Download bulk export error: {r.status_code} {r.text}")
  return r.content


def upload_to_s3(data: bytes, filename: str) -> str:
  if not EVIDENCE_S3_BUCKET:
    raise RuntimeError("Missing EVIDENCE_S3_BUCKET env var")
  s3 = boto3.client("s3")
  key = EVIDENCE_S3_PREFIX.rstrip("/") + "/" + filename
  s3.put_object(Bucket=EVIDENCE_S3_BUCKET, Key=key, Body=data, ContentType="text/csv")
  return f"s3://{EVIDENCE_S3_BUCKET}/{key}"


def make_response(status: str, location: str, correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
  evidence = {"location": location}
  return {
    "status": status,
    "evidence": {"count": 1 if location else 0, "items": [evidence] if evidence else []},
    "timingMs": int((time.time() - start) * 1000) if start else 0,
    "meta": {"provider": "genesys-cloud", "feature": "bulk-export"},
    "error": {"code": error_code, "message": error_message},
    "correlationId": correlation_id,
  }


def lambda_handler(event, _context):
  start = time.time()
  correlation_id = (event or {}).get("correlationId", "")
  try:
    token = gc_token()
    job_id = start_bulk_export(token)
    status = poll_bulk_export(token, job_id)
    if status.get("status") != "completed":
      raise RuntimeError(f"Bulk export failed: {json.dumps(status)}")
    download_url = status.get("result", {}).get("downloadUrl")
    if not download_url:
      raise RuntimeError("Missing downloadUrl in bulk export result")
    data = download_export(token, download_url)
    timestamp = time.strftime("%Y%m%d-%H%M%S", time.gmtime())
    s3_uri = upload_to_s3(data, f"vendor-ledger-{timestamp}.csv")
    return make_response("SUCCESS", s3_uri, correlation_id, start=start)
  except requests.HTTPError as e:
    return make_response("FAILURE", "", correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
  except Exception as e:
    return make_response("FAILURE", "", correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

