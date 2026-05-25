import os
import time
from typing import Any, Dict, Optional

import requests
from requests.auth import HTTPBasicAuth


class SumoClientError(Exception):
    pass


def _api_base() -> str:
    return os.getenv("SUMO_API_BASE", "https://api.sumologic.com/api")


def _auth() -> HTTPBasicAuth:
    access_id = os.getenv("SUMO_ACCESS_ID")
    access_key = os.getenv("SUMO_ACCESS_KEY")
    if not access_id or not access_key:
        raise SumoClientError("SUMO_ACCESS_ID and SUMO_ACCESS_KEY are required")
    return HTTPBasicAuth(access_id, access_key)


def _submit_job(query: str, start: int, end: int, time_zone: str) -> str:
    url = f"{_api_base().rstrip('/')}/v1/search/jobs"
    payload = {"query": query, "from": start, "to": end, "timeZone": time_zone}
    resp = requests.post(url, auth=_auth(), json=payload, timeout=30)
    if resp.status_code not in (200, 202):
        raise SumoClientError(f"submit error: {resp.status_code} {resp.text}")
    return resp.json().get("id")


def _wait_job(job_id: str, timeout_s: int = 120) -> Dict[str, Any]:
    url = f"{_api_base().rstrip('/')}/v1/search/jobs/{job_id}"
    start = time.time()
    while True:
        resp = requests.get(url, auth=_auth(), timeout=30)
        if resp.status_code != 200:
            raise SumoClientError(f"status error: {resp.status_code} {resp.text}")
        st = resp.json()
        state = st.get("state")
        if state in ("DONE GATHERING RESULTS", "CANCELLED", "FORCE PAUSED"):
            return st
        if time.time() - start > timeout_s:
            raise SumoClientError("job timeout")
        time.sleep(2)


def _get_messages(job_id: str, limit: int = 1000) -> Dict[str, Any]:
    url = f"{_api_base().rstrip('/')}/v1/search/jobs/{job_id}/messages?limit={limit}"
    resp = requests.get(url, auth=_auth(), timeout=60)
    if resp.status_code != 200:
        raise SumoClientError(f"messages error: {resp.status_code} {resp.text}")
    return resp.json()


def _get_records(job_id: str, limit: int = 1000) -> Dict[str, Any]:
    url = f"{_api_base().rstrip('/')}/v1/search/jobs/{job_id}/records?limit={limit}"
    resp = requests.get(url, auth=_auth(), timeout=60)
    if resp.status_code != 200:
        raise SumoClientError(f"records error: {resp.status_code} {resp.text}")
    return resp.json()


def run_search(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.sumologic.run_search.run_search

    Inputs:
      - query: str
      - timeRangeMinutes: int (default 60)
      - timeZone: str (default UTC)
      - limit: int (default 1000)
    """
    query = event.get("query")
    if not query:
        return {"status": "failure", "message": "query required"}
    minutes = int(event.get("timeRangeMinutes", 60))
    tz = event.get("timeZone", "UTC")
    limit = int(event.get("limit", 1000))

    end_ms = int(time.time() * 1000)
    start_ms = end_ms - minutes * 60 * 1000

    try:
        job_id = _submit_job(query, start_ms, end_ms, tz)
        st = _wait_job(job_id)
        msgs = _get_messages(job_id, limit)
        recs = _get_records(job_id, limit)
        total = (msgs.get("messageCount", 0) or 0) + (recs.get("recordCount", 0) or 0)
        return {"status": "success", "jobId": job_id, "state": st.get("state"), "messages": msgs, "records": recs, "resultCount": total}
    except SumoClientError as e:
        return {"status": "failure", "message": str(e)}

