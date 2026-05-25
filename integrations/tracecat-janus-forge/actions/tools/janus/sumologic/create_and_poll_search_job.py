from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional

import httpx
from tracecat_registry import RegistrySecret, registry


@registry.register(
    name="tools.janus.sumologic.create_and_poll_search_job",
    description="Create a Sumo Logic search job from a query, poll until completion, and return records.",
    secrets=[
        RegistrySecret(
            name="SUMO_ACCESS_ID",
            description="Sumo Logic Access ID",
            env_var="SUMO_ACCESS_ID",
        ),
        RegistrySecret(
            name="SUMO_ACCESS_KEY",
            description="Sumo Logic Access Key",
            env_var="SUMO_ACCESS_KEY",
        ),
        RegistrySecret(
            name="SUMO_BASE_URL",
            description="Optional base URL for Sumo Logic API (e.g., https://api.us2.sumologic.com)",
            env_var="SUMO_BASE_URL",
            optional=True,
        ),
    ],
)
def create_and_poll_search_job(
    query: str,
    from_time: Optional[str] = None,
    to_time: Optional[str] = None,
    poll_interval_seconds: float = 2.0,
    poll_timeout_seconds: int = 180,
) -> Dict[str, Any]:
    """Create a Sumo Logic search job and return its final records as JSON.

    Args:
        query: The Sumo query string.
        from_time: Start time (e.g., "-24h" or epoch millis). Defaults to "-24h".
        to_time: End time (e.g., "now" or epoch millis). Defaults to "now".
        poll_interval_seconds: Polling interval in seconds.
        poll_timeout_seconds: Maximum time to wait for completion.

    Returns:
        Dict with key "records" holding the aggregated search results.
    """

    access_id = os.environ.get("SUMO_ACCESS_ID")
    access_key = os.environ.get("SUMO_ACCESS_KEY")
    base_url = os.environ.get("SUMO_BASE_URL", "https://api.us2.sumologic.com")

    if not access_id or not access_key:
        raise RuntimeError("Missing Sumo Logic credentials in environment: SUMO_ACCESS_ID/SUMO_ACCESS_KEY")

    start = from_time or "-24h"
    end = to_time or "now"

    create_url = f"{base_url}/api/v1/search/jobs"

    with httpx.Client(timeout=30.0, auth=(access_id, access_key)) as client:
        create_resp = client.post(
            create_url,
            json={
                "query": query,
                "from": start,
                "to": end,
                "timeZone": "UTC",
            },
            headers={"Accept": "application/json"},
        )
        create_resp.raise_for_status()
        job = create_resp.json()
        job_id = job.get("id")
        if not job_id:
            raise RuntimeError("Sumo create job response missing 'id'")

        status_url = f"{base_url}/api/v1/search/jobs/{job_id}"
        records_url = f"{base_url}/api/v1/search/jobs/{job_id}/records"

        deadline = time.time() + poll_timeout_seconds
        last_state = None

        while time.time() < deadline:
            status_resp = client.get(status_url, headers={"Accept": "application/json"})
            status_resp.raise_for_status()
            status = status_resp.json()
            state = status.get("state")
            if state != last_state:
                last_state = state
            if state == "DONE GATHERING RESULTS":
                break
            time.sleep(poll_interval_seconds)
        else:
            raise TimeoutError("Timed out waiting for Sumo Logic search job to complete")

        rec_resp = client.get(records_url, headers={"Accept": "application/json"})
        rec_resp.raise_for_status()
        rec = rec_resp.json()

    # Sumo returns {"records": [{"map": {...}}, ...]} for records endpoint
    records = rec.get("records", [])
    return {"records": records}

