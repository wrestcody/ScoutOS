import os
from typing import Any, Dict

import requests


def get_config(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.snyk.get_config.get_config

    Secrets via env:
      - SNYK_TOKEN
    """
    token = os.getenv("SNYK_TOKEN")
    if not token:
        return {"status": "failure", "message": "SNYK_TOKEN not set"}
    headers = {"Authorization": f"token {token}", "Accept": "application/json"}
    try:
        # Orgs
        orgs = requests.get("https://api.snyk.io/rest/orgs?version=2023-08-01", headers=headers, timeout=30)
        # Settings per org could be fetched; keep orgs as base snapshot
        if orgs.status_code != 200:
            return {"status": "failure", "message": f"orgs {orgs.status_code} {orgs.text}"}
        return {"status": "success", "config": {"orgs": orgs.json()}}
    except Exception as e:
        return {"status": "failure", "message": str(e)}

