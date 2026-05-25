import json
import os
import time
from typing import Dict, Any

import boto3
import requests


GC_OAUTH_SECRET_ARN = os.environ.get("GC_OAUTH_SECRET_ARN", "")
GC_REGION = os.environ.get("GC_REGION", "us-east-1")
GC_LOGIN_URL = os.environ.get("GC_LOGIN_URL", "")
GC_SUMMARY_API_URL = os.environ.get("GC_SUMMARY_API_URL", "")


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


def build_grc_summary_template() -> Dict[str, Any]:
  return {
    "name": "GRC-Privileged-Activity-Summary",
    "version": "1.0",
    "instructions": [
      "Summarize all administrative actions in the provided text.",
      "Specifically identify and list any actions related to user creation, role changes, or permission escalations.",
      "Flag any actions that appear anomalous or high-risk and explain why."
    ],
    "outputSchema": {
      "type": "object",
      "properties": {
        "summary": {"type": "string"},
        "adminActions": {"type": "array", "items": {"type": "string"}},
        "highRiskFindings": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["summary", "adminActions", "highRiskFindings"]
    }
  }


def call_copilot_summary_api(token: str, raw_text: str, template: Dict[str, Any]) -> Dict[str, Any]:
  if not GC_SUMMARY_API_URL:
    raise RuntimeError("Missing GC_SUMMARY_API_URL env var (Configurable Agent Copilot Summaries endpoint)")
  headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
  payload = {"template": template, "input": {"text": raw_text}}
  r = requests.post(GC_SUMMARY_API_URL, headers=headers, json=payload, timeout=60)
  if r.status_code >= 400:
    raise requests.HTTPError(f"GC Summary API error: {r.status_code} {r.text}")
  return r.json() or {}


def make_response(status: str, result: Dict[str, Any], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
  return {
    "status": status,
    "evidence": {"count": 1 if result else 0, "items": [result] if result else []},
    "timingMs": int((time.time() - start) * 1000) if start else 0,
    "meta": {"provider": "genesys-cloud", "feature": "copilot-summaries"},
    "error": {"code": error_code, "message": error_message},
    "correlationId": correlation_id,
  }


def lambda_handler(event, _context):
  start = time.time()
  correlation_id = (event or {}).get("correlationId", "")
  params = (event or {}).get("params", {}) or {}
  raw_text = params.get("rawText") or ""
  try:
    if not raw_text:
      raise RuntimeError("Missing 'rawText' in params")
    token = gc_token()
    template = build_grc_summary_template()
    result = call_copilot_summary_api(token, raw_text, template)
    return make_response("SUCCESS", result, correlation_id, start=start)
  except requests.HTTPError as e:
    return make_response("FAILURE", {}, correlation_id, error_code="HTTP_ERROR", error_message=str(e), start=start)
  except Exception as e:
    return make_response("FAILURE", {}, correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

