import os
from typing import Any, Dict

import requests


def get_config(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.tenable.get_config.get_config

    Secrets via env:
      - TIO_ACCESS_KEY
      - TIO_SECRET_KEY
    """
    ak = os.getenv("TIO_ACCESS_KEY")
    sk = os.getenv("TIO_SECRET_KEY")
    if not ak or not sk:
        return {"status": "failure", "message": "TIO_ACCESS_KEY/SECRET_KEY not set"}
    headers = {
        "X-ApiKeys": f"accessKey={ak}; secretKey={sk}",
        "Accept": "application/json",
    }
    try:
        scanners = requests.get("https://cloud.tenable.com/scanners", headers=headers, timeout=30)
        policies = requests.get("https://cloud.tenable.com/policies", headers=headers, timeout=30)
        return {
            "status": "success",
            "config": {
                "scanners": scanners.json() if scanners.ok else {"error": scanners.text},
                "policies": policies.json() if policies.ok else {"error": policies.text},
            },
        }
    except Exception as e:
        return {"status": "failure", "message": str(e)}

