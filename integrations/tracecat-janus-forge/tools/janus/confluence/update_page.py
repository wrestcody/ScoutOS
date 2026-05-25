import os
from typing import Any, Dict

import requests
from requests.auth import HTTPBasicAuth


def update_page(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.confluence.update_page.update_page

    Inputs:
      - pageId: str
      - appendHtml: str (HTML to append)

    Secrets via env:
      - CONFLUENCE_BASE_URL
      - CONFLUENCE_EMAIL
      - CONFLUENCE_API_TOKEN
    """
    base = os.getenv("CONFLUENCE_BASE_URL")
    email = os.getenv("CONFLUENCE_EMAIL")
    token = os.getenv("CONFLUENCE_API_TOKEN")
    if not all([base, email, token]):
        return {"status": "failure", "message": "CONFLUENCE_* secrets not set"}

    page_id = event.get("pageId")
    html = event.get("appendHtml") or ""
    if not page_id or not html:
        return {"status": "failure", "message": "pageId and appendHtml required"}

    auth = HTTPBasicAuth(email, token)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}

    # Get current page version and body
    get_resp = requests.get(f"{base}/rest/api/content/{page_id}?expand=body.storage,version", headers=headers, auth=auth, timeout=30)
    if get_resp.status_code != 200:
        return {"status": "failure", "message": f"confluence get {get_resp.status_code} {get_resp.text}"}
    page = get_resp.json()
    ver = page.get("version", {}).get("number", 1)
    body_html = page.get("body", {}).get("storage", {}).get("value", "") + html

    put_payload = {
        "id": page_id,
        "type": "page",
        "title": page.get("title"),
        "version": {"number": ver + 1},
        "body": {"storage": {"value": body_html, "representation": "storage"}},
    }
    put_resp = requests.put(f"{base}/rest/api/content/{page_id}", headers=headers, auth=auth, json=put_payload, timeout=30)
    if put_resp.status_code not in (200, 202):
        return {"status": "failure", "message": f"confluence update {put_resp.status_code} {put_resp.text}"}
    return {"status": "success", "page": put_resp.json()}

