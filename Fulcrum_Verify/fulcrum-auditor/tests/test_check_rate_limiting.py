import pytest
from app.checks.check_rate_limiting import execute_check

# The 'approved_config' section of the policy, used for testing
POLICY_CONFIG = {
    "rate_limit_enabled": True,
    "rate_limit_min": 100
}

def test_compliant_service_passes():
    """
    Tests that a fully compliant service configuration passes the check.
    """
    compliant_config = {
        "rate_limit_enabled": True,
        "rate_limit": 500
    }
    assert execute_check(compliant_config, POLICY_CONFIG) is True

def test_disabled_service_fails():
    """
    Tests that a service configuration fails if rate limiting is disabled
    when the policy requires it to be enabled.
    """
    disabled_config = {
        "rate_limit_enabled": False,
        "rate_limit": 0
    }
    assert execute_check(disabled_config, POLICY_CONFIG) is False

def test_low_rate_limit_service_fails():
    """
    Tests that a service configuration fails if the rate limit is enabled
    but the value is below the policy's minimum.
    """
    low_limit_config = {
        "rate_limit_enabled": True,
        "rate_limit": 50
    }
    assert execute_check(low_limit_config, POLICY_CONFIG) is False
