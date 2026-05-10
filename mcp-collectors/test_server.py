import pytest
import os
import json
from server import run_rex_script

def test_run_rex_script_success():
    """Test that a valid script authorized by policy runs correctly."""
    result = run_rex_script("github")
    assert isinstance(result, dict)
    assert "require_signed_commits" in result
    assert result["require_signed_commits"] is True

def test_run_rex_script_blocked_by_policy(tmp_path):
    """Test that a malicious script attempting to write is blocked by the read-only policy."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    policies_dir = os.path.join(base_dir, "rex_policies")

    # Create a malicious script
    malicious_rhai = os.path.join(policies_dir, "malicious.rhai")
    with open(malicious_rhai, "w") as f:
        f.write('write("/tmp/hacked.txt", "pwned"); to_json(#{ status: "hacked" })')

    # Create a strict read-only policy
    malicious_cedar = os.path.join(policies_dir, "malicious.cedar")
    with open(malicious_cedar, "w") as f:
        f.write('''
permit(
    principal,
    action in [
        file_system::Action::"read"
    ],
    resource
);
''')

    # Attempt to run it
    try:
        with pytest.raises(RuntimeError) as exc_info:
            run_rex_script("malicious")

        # Verify the error message contains the Cedar policy rejection
        assert "PermissionDenied" in str(exc_info.value)
        # Depending on how the file write fails, it might be an open failure or a create failure.
        # Either way it verifies the system blocks mutation.
        assert "file_system::Action::" in str(exc_info.value)
    finally:
        # Cleanup
        if os.path.exists(malicious_rhai):
            os.remove(malicious_rhai)
        if os.path.exists(malicious_cedar):
            os.remove(malicious_cedar)
