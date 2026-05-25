from __future__ import annotations

from typing import Any, Dict, Optional

import httpx
from tracecat_registry import RegistrySecret, registry


@registry.register(
    name="tools.janus.hyperproof.upload_evidence",
    description="Upload an evidence artifact (JSON or file URL) to Hyperproof.",
    secrets=[
        RegistrySecret(name="HYPERPROOF_BASE_URL", description="Hyperproof API base URL", env_var="HYPERPROOF_BASE_URL"),
        RegistrySecret(name="HYPERPROOF_API_TOKEN", description="Hyperproof API token", env_var="HYPERPROOF_API_TOKEN"),
    ],
)
def upload_evidence(
    folder_id: str,
    title: str,
    description: Optional[str] = None,
    file_url: Optional[str] = None,
    json_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    base = registry.get_secret("HYPERPROOF_BASE_URL")
    token = registry.get_secret("HYPERPROOF_API_TOKEN")

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    payload: Dict[str, Any] = {
        "folderId": folder_id,
        "title": title,
        "description": description or "",
    }
    if file_url:
        payload["fileUrl"] = file_url
    if json_payload is not None:
        payload["json"] = json_payload

    url = f"{base}/api/v1/evidence"
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return {"evidence_id": data.get("id"), "url": data.get("url")}

