import os
from typing import Any, Dict, List, Optional

import requests


class GenesysClientError(Exception):
    pass


def _get_token(login_base: str, client_id: str, client_secret: str) -> str:
    url = f"{login_base.rstrip('/')}/oauth/token"
    resp = requests.post(
        url,
        data={"grant_type": "client_credentials"},
        auth=(client_id, client_secret),
        timeout=30,
    )
    if resp.status_code != 200:
        raise GenesysClientError(f"Auth failed: {resp.status_code} {resp.text}")
    return resp.json().get("access_token")


def _create_chat(api_base: str, token: str, member_user_ids: List[str]) -> str:
    url = f"{api_base.rstrip('/')}/api/v2/conversations/chats"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # Minimal payload for internal chat
    payload = {
        "memberAddresses": [],
        "members": [{"id": uid} for uid in member_user_ids],
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    if resp.status_code not in (200, 201):
        raise GenesysClientError(f"Create chat failed: {resp.status_code} {resp.text}")
    return resp.json().get("id") or resp.json().get("conversationId")


def _post_message(api_base: str, token: str, conversation_id: str, text: str) -> Dict[str, Any]:
    url = f"{api_base.rstrip('/')}/api/v2/conversations/chats/{conversation_id}/messages"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {"body": text}
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    if resp.status_code not in (200, 201):
        raise GenesysClientError(f"Send message failed: {resp.status_code} {resp.text}")
    return resp.json()


def send_message(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.genesys.send_message.send_message

    Inputs:
      - text: str
      - conversationId: str (optional)
      - memberUserIds: list[str] (optional, used if conversationId not given)
      - dryRun: bool (optional)

    Secrets via env:
      - GENESYS_LOGIN_BASE (e.g., https://login.mypurecloud.com)
      - GENESYS_API_BASE (e.g., https://api.mypurecloud.com)
      - GENESYS_CLIENT_ID
      - GENESYS_CLIENT_SECRET
    """
    text = (event.get("text") or "").strip()
    conversation_id: Optional[str] = event.get("conversationId")
    member_user_ids: List[str] = event.get("memberUserIds") or []
    dry_run = bool(event.get("dryRun", False))

    if not text:
        return {"status": "failure", "message": "text is required"}

    if not conversation_id and not member_user_ids:
        return {"status": "failure", "message": "conversationId or memberUserIds required"}

    if dry_run:
        return {"status": "success", "dryRun": True}

    login_base = os.getenv("GENESYS_LOGIN_BASE")
    api_base = os.getenv("GENESYS_API_BASE")
    client_id = os.getenv("GENESYS_CLIENT_ID")
    client_secret = os.getenv("GENESYS_CLIENT_SECRET")
    if not all([login_base, api_base, client_id, client_secret]):
        return {"status": "failure", "message": "Genesys env secrets not configured"}

    try:
        token = _get_token(login_base, client_id, client_secret)
        conv_id = conversation_id or _create_chat(api_base, token, member_user_ids)
        msg = _post_message(api_base, token, conv_id, text)
        return {"status": "success", "conversationId": conv_id, "message": msg}
    except GenesysClientError as e:
        return {"status": "failure", "message": str(e)}

