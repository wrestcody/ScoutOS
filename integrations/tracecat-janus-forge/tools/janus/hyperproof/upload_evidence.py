import io
import json
import os
import time
import hashlib
import random
import base64
from typing import Any, Dict, Optional

import requests
try:
    import boto3  # optional for KMS signing
    from botocore.exceptions import BotoCoreError, ClientError
except Exception:  # pragma: no cover
    boto3 = None
    BotoCoreError = ClientError = Exception


class HyperproofClientError(Exception):
    pass


def _retry_request(method: str, url: str, *, headers: dict = None, timeout: int = 30, max_retries: int = 5, backoff_base: float = 0.5, **kwargs):
    attempt = 0
    while True:
        resp = requests.request(method, url, headers=headers, timeout=timeout, **kwargs)
        if resp.status_code in (429, 500, 502, 503, 504):
            attempt += 1
            if attempt > max_retries:
                return resp
            # Exponential backoff with jitter
            sleep_s = backoff_base * (2 ** (attempt - 1)) + random.uniform(0, 0.25)
            time.sleep(sleep_s)
            continue
        return resp


def _get_oauth_token(client_id: str, client_secret: str, auth_url: str) -> str:
    resp = _retry_request(
        "POST",
        auth_url,
        data={"grant_type": "client_credentials"},
        auth=(client_id, client_secret),
        timeout=30,
    )
    if resp.status_code != 200:
        raise HyperproofClientError(f"Auth failed: {resp.status_code} {resp.text}")
    return resp.json().get("access_token")


def _find_control(base_url: str, token: str, control_id: str) -> Dict[str, Any]:
    url = f"{base_url.rstrip('/')}/controls/{control_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = _retry_request("GET", url, headers=headers, timeout=30)
    if resp.status_code == 404:
        raise HyperproofClientError(f"Control {control_id} not found")
    if resp.status_code != 200:
        raise HyperproofClientError(f"Find control error: {resp.status_code} {resp.text}")
    return resp.json()


def _create_proof(base_url: str, token: str, control_id: str, title: str, description: str, idempotency_key: Optional[str]) -> Dict[str, Any]:
    url = f"{base_url.rstrip('/')}/controls/{control_id}/proofs"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if idempotency_key:
        # Use common header name; server may ignore if unsupported
        headers["Idempotency-Key"] = idempotency_key
    payload = {"title": title, "description": description}
    resp = _retry_request("POST", url, headers=headers, json=payload, timeout=30)
    if resp.status_code not in (200, 201):
        raise HyperproofClientError(f"Create proof error: {resp.status_code} {resp.text}")
    return resp.json()


def _attach_file(base_url: str, token: str, proof_id: str, filename: str, content_bytes: bytes) -> Dict[str, Any]:
    url = f"{base_url.rstrip('/')}/proofs/{proof_id}/attachments"
    headers = {"Authorization": f"Bearer {token}"}
    files = {
        "file": (filename, io.BytesIO(content_bytes), "application/octet-stream"),
    }
    resp = _retry_request("POST", url, headers=headers, files=files, timeout=60)
    if resp.status_code not in (200, 201):
        raise HyperproofClientError(f"Attach file error: {resp.status_code} {resp.text}")
    return resp.json()


def _redact(obj: Any, fields: Optional[list]) -> Any:
    if not fields:
        return obj
    try:
        if isinstance(obj, dict):
            return {k: ("[REDACTED]" if k in fields else _redact(v, fields)) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_redact(v, fields) for v in obj]
        return obj
    except Exception:
        return obj


def upload_evidence(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.hyperproof.upload_evidence

    Inputs:
      - controlId: str
      - evidenceTitle: str
      - evidenceDescription: str
      - evidenceData: JSON or CSV/text
      - collectionTimestamp: ISO8601 string
      - dryRun: bool (optional)
      - redactFields: list[str] (optional)

    Secrets via env:
      - HYPERPROOF_CLIENT_ID
      - HYPERPROOF_CLIENT_SECRET
      - HYPERPROOF_AUTH_URL (default https://auth.hyperproof.app/oauth2/token)
      - HYPERPROOF_API_BASE (default https://api.hyperproof.app/v1)
    """
    control_id = event.get("controlId")
    title = event.get("evidenceTitle")
    description = event.get("evidenceDescription")
    data_obj = event.get("evidenceData")
    collected_at = event.get("collectionTimestamp")
    dry_run = bool(event.get("dryRun", False))
    redact_fields = event.get("redactFields") or []

    if not all([control_id, title, description, data_obj, collected_at]):
        return {"status": "failure", "message": "Missing required input fields."}

    # Redact PII fields if requested
    redacted_payload = _redact(data_obj, redact_fields)

    # Compute idempotency key
    try:
        raw_bytes = json.dumps({
            "controlId": control_id,
            "title": title,
            "description": description,
            "data": redacted_payload,
            "collectedAt": collected_at,
        }, separators=(",", ":"), sort_keys=True).encode("utf-8")
    except Exception:
        raw_bytes = str({
            "controlId": control_id,
            "title": title,
            "description": description,
            "data": str(redacted_payload),
            "collectedAt": collected_at,
        }).encode("utf-8")
    idem_key = hashlib.sha256(raw_bytes).hexdigest()

    client_id = os.getenv("HYPERPROOF_CLIENT_ID")
    client_secret = os.getenv("HYPERPROOF_CLIENT_SECRET")
    auth_url = os.getenv("HYPERPROOF_AUTH_URL", "https://auth.hyperproof.app/oauth2/token")
    api_base = os.getenv("HYPERPROOF_API_BASE", "https://api.hyperproof.app/v1")

    if dry_run:
        return {"status": "success", "dryRun": True, "idempotencyKey": idem_key}

    try:
        token = _get_oauth_token(client_id, client_secret, auth_url)
        _ = _find_control(api_base, token, control_id)
        proof = _create_proof(api_base, token, control_id, title, description, idem_key)

        # Prepare evidence content
        filename = "evidence.json"
        if isinstance(redacted_payload, (dict, list)):
            content_bytes = json.dumps({
                "collectedAt": collected_at,
                "payload": redacted_payload,
                "janusForgeMeta": {
                    "engine": "Tracecat",
                    "udf": "tools.janus.hyperproof.upload_evidence",
                    "idempotencyKey": idem_key,
                    "timestamp": int(time.time())
                }
            }, separators=(",", ":")).encode("utf-8")
        elif isinstance(redacted_payload, str):
            content_bytes = redacted_payload.encode("utf-8")
            filename = "evidence.csv" if "," in redacted_payload else "evidence.txt"
        else:
            content_bytes = str(redacted_payload).encode("utf-8")
            filename = "evidence.txt"

        proof_id = proof.get("id") or proof.get("proofId")
        attach = _attach_file(api_base, token, proof_id, filename, content_bytes)

        payload_hash = hashlib.sha256(content_bytes).hexdigest()

        # Optional KMS signing of the payload hash
        signature_b64: Optional[str] = None
        signature_alg: Optional[str] = None
        signer_key_id: Optional[str] = None
        kms_key_id = os.getenv("HYPERPROOF_EVIDENCE_KMS_KEY_ID")
        kms_alg = os.getenv("HYPERPROOF_EVIDENCE_KMS_ALG", "RSASSA_PSS_SHA_256")
        if kms_key_id and boto3 is not None:
            try:
                kms = boto3.client("kms")
                sig = kms.sign(
                    KeyId=kms_key_id,
                    Message=bytes.fromhex(payload_hash),
                    MessageType="DIGEST",
                    SigningAlgorithm=kms_alg,
                )
                signature_b64 = base64.b64encode(sig["Signature"]).decode("ascii")
                signature_alg = kms_alg
                signer_key_id = sig.get("KeyId", kms_key_id)
            except (BotoCoreError, ClientError) as e:  # non-fatal
                signature_b64 = None
                signature_alg = None
                signer_key_id = None

        return {
            "status": "success",
            "proofId": proof_id,
            "attachmentId": attach.get("id"),
            "idempotencyKey": idem_key,
            "payloadHash": payload_hash,
            "hashAlgorithm": "SHA-256",
            "signature": signature_b64,
            "signatureAlgorithm": signature_alg,
            "signerKeyId": signer_key_id,
        }
    except HyperproofClientError as e:
        return {"status": "failure", "message": str(e), "idempotencyKey": idem_key}
    except Exception as e:
        return {"status": "failure", "message": f"Unexpected error: {e}", "idempotencyKey": idem_key}

