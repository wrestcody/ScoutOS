import os
from typing import Any, Dict

import requests


def get_config(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.codacy.get_config.get_config

    Secrets via env:
      - CODACY_API_TOKEN
    """
    token = os.getenv("CODACY_API_TOKEN")
    if not token:
        return {"status": "failure", "message": "CODACY_API_TOKEN not set"}
    headers = {"api-token": token, "Accept": "application/json"}
    try:
        # Organizations/projects listing as a proxy for current configuration
        orgs = requests.get("https://app.codacy.com/api/v3/organizations", headers=headers, timeout=30)
        if orgs.status_code != 200:
            return {"status": "failure", "message": f"orgs {orgs.status_code} {orgs.text}"}
        return {"status": "success", "config": {"organizations": orgs.json()}}
    except Exception as e:
        return {"status": "failure", "message": str(e)}

