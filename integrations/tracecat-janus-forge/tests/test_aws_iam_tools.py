from __future__ import annotations

from typing import Any, Dict

import pytest

from actions.tools.janus.aws.get_user_mfa_status import get_user_mfa_status


class FakeIAM:
    def list_mfa_devices(self, UserName: str) -> Dict[str, Any]:  # noqa: N803
        if UserName == "alice":
            return {"MFADevices": [{"SerialNumber": "arn:aws:iam::123:mfa/alice"}]}
        return {"MFADevices": []}


def test_get_user_mfa_status(monkeypatch: Any) -> None:
    import actions.tools.janus.aws.get_user_mfa_status as mod

    def fake_client(name: str, *args: Any, **kwargs: Any) -> Any:  # noqa: ARG001
        assert name == "iam"
        return FakeIAM()

    monkeypatch.setattr(mod.boto3, "client", fake_client)
    out = get_user_mfa_status(user_name="alice")
    assert out["mfa_enabled"] is True
    out2 = get_user_mfa_status(user_name="bob")
    assert out2["mfa_enabled"] is False

