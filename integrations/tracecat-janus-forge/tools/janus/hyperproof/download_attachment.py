import os
import hashlib
from typing import Any, Dict

import requests


class HyperproofClientError(Exception):
    pass


def _get_oauth_token(client_id: str, client_secret: str, auth_url: str) -> str:
    resp = requests.post(
        auth_url,
        data={"grant_type": "client_credentials"},
        auth=(client_id, client_secret),
        timeout=30,
    )
    if resp.status_code != 200:
        raise HyperproofClientError(f"Auth failed: {resp.status_code} {resp.text}")
    return resp.json().get("access_token")


def download_and_hash(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.hyperproof.download_attachment.download_and_hash

    Inputs:
      - proofId: str
      - attachmentId: str

    Secrets via env:
      - HYPERPROOF_CLIENT_ID
      - HYPERPROOF_CLIENT_SECRET
      - HYPERPROOF_AUTH_URL (default https://auth.hyperproof.app/oauth2/token)
      - HYPERPROOF_API_BASE (default https://api.hyperproof.app/v1)
    """
    proof_id = event.get("proofId")
    attachment_id = event.get("attachmentId")
    if not proof_id or not attachment_id:
        return {"status": "failure", "message": "proofId and attachmentId required"}

    client_id = os.getenv("HYPERPROOF_CLIENT_ID")
    client_secret = os.getenv("HYPERPROOF_CLIENT_SECRET")
    auth_url = os.getenv("HYPERPROOF_AUTH_URL", "https://auth.hyperproof.app/oauth2/token")
    api_base = os.getenv("HYPERPROOF_API_BASE", "https://api.hyperproof.app/v1")

    token = _get_oauth_token(client_id, client_secret, auth_url)
    url = f"{api_base.rstrip('/')}/proofs/{proof_id}/attachments/{attachment_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=60)
    if resp.status_code != 200:
        return {"status": "failure", "message": f"download error: {resp.status_code} {resp.text}"}

    payload_hash = hashlib.sha256(resp.content).hexdigest()
    return {"status": "success", "payloadHash": payload_hash, "contentLength": len(resp.content)}

