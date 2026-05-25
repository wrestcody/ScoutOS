from __future__ import annotations

import os
from typing import Any

import pytest
import httpx

from actions.tools.janus.sumologic.create_and_poll_search_job import create_and_poll_search_job


class MockTransport(httpx.BaseTransport):
    def handle_request(self, request: httpx.Request) -> httpx.Response:  # type: ignore[override]
        if request.url.path.endswith("/api/v1/search/jobs") and request.method == "POST":
            return httpx.Response(200, json={"id": "job-123"})
        if request.url.path.endswith("/api/v1/search/jobs/job-123") and request.method == "GET":
            # Immediately report done
            return httpx.Response(200, json={"state": "DONE GATHERING RESULTS"})
        if request.url.path.endswith("/api/v1/search/jobs/job-123/records") and request.method == "GET":
            return httpx.Response(200, json={"records": [{"map": {"ok": True}}]})
        return httpx.Response(404)


def test_create_and_poll_search_job(monkeypatch: Any) -> None:
    monkeypatch.setenv("SUMO_ACCESS_ID", "id")
    monkeypatch.setenv("SUMO_ACCESS_KEY", "key")
    monkeypatch.setenv("SUMO_BASE_URL", "https://api.test.sumologic.com")

    # Patch httpx.Client to use our transport
    orig_client = httpx.Client

    def client_factory(*args: Any, **kwargs: Any) -> httpx.Client:  # type: ignore[no-redef]
        kwargs["transport"] = MockTransport()
        return orig_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "Client", client_factory)

    out = create_and_poll_search_job(query="_sourceCategory=foo")
    assert "records" in out and isinstance(out["records"], list)
    assert out["records"][0]["map"]["ok"] is True

