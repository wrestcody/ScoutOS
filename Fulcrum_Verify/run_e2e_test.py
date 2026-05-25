import httpx
import sys
import json

def run_e2e_test():
    """
    Runs the final E2E test, validating the rich API response structure,
    including the presence of the audit attestation.
    """
    print("🚀 Starting Fulcrum Verify E2E Test (with Attestation Check)...")

    url = "http://localhost:8000/api/run-audit/rate-limiting"

    try:
        with httpx.Client() as client:
            response = client.post(url, timeout=15.0) # Increased timeout for final step
            response.raise_for_status()

            data = response.json()

            # Final Assertions
            print("🔬 Verifying final response data...")
            assert 'audit_attestation' in data, "Missing 'audit_attestation' in the response"
            assert data['audit_attestation'].startswith('ey'), "Attestation token does not look like a JWT"

            assert data['status'] == 'complete', f"Expected status 'complete', but got '{data.get('status')}'"
            assert data['summary']['failed'] == 2, f"Expected summary.failed to be 2, but got {data.get('summary', {}).get('failed')}"
            assert len(data['failed_results']) == 2, f"Expected 2 failed results, but got {len(data.get('failed_results', []))}"
            assert 'remediation_ticket' in data['failed_results'][0], "Missing 'remediation_ticket' in the first failed result"

            print("✅ E2E Test Passed!")
            sys.exit(0)

    except httpx.ConnectError:
        print("❌ E2E Test Failed: Could not connect. Are you sure 'docker-compose up' is running?")
        sys.exit(1)
    except httpx.HTTPStatusError as e:
        print(f"❌ E2E Test Failed! Received bad status code: {e.response.status_code}")
        sys.exit(1)
    except (AssertionError, KeyError, IndexError) as e:
        print(f"❌ E2E Test Failed! Details: {e}")
        print("Received data:", json.dumps(data, indent=2))
        sys.exit(1)
    except Exception as e:
        print(f"❌ E2E Test Failed with an unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_e2e_test()
