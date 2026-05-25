import os
from typing import Any, Dict

import requests


def _token() -> str:
    base = os.getenv("FALCON_BASE_URL", "https://api.crowdstrike.com")
    cid = os.getenv("FALCON_CLIENT_ID")
    secret = os.getenv("FALCON_CLIENT_SECRET")
    if not cid or not secret:
        raise RuntimeError("FALCON_CLIENT_ID/SECRET not set")
    resp = requests.post(f"{base}/oauth2/token", data={"client_id": cid, "client_secret": secret}, timeout=30)
    resp.raise_for_status()
    return resp.json().get("access_token")


def get_config(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.crowdstrike.get_config.get_config

    Secrets via env:
      - FALCON_CLIENT_ID, FALCON_CLIENT_SECRET, FALCON_BASE_URL
    """
    try:
        tok = _token()
        base = os.getenv("FALCON_BASE_URL", "https://api.crowdstrike.com")
        headers = {"Authorization": f"Bearer {tok}"}
        # Fetch prevention policies as a representative configuration
        pol = requests.get(f"{base}/policy/combined/prevention-policies/v1", headers=headers, timeout=30)
        return {"status": "success", "config": {"preventionPolicies": pol.json() if pol.ok else {"error": pol.text}}}
    except Exception as e:
        return {"status": "failure", "message": str(e)}

