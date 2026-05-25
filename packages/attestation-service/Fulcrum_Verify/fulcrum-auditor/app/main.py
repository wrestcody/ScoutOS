from fastapi import FastAPI
import httpx
from typing import Dict, List

# Import the pluggable check function
from app.checks.check_rate_limiting import execute_check

app = FastAPI()

@app.post("/api/run-audit/rate-limiting")
async def run_audit():
    """
    Runs a compliance audit, creates detailed tickets, gets a signed attestation,
    and returns the full results.
    """
    print("Audit starting...")
    passed_results: List[Dict] = []
    failed_results: List[Dict] = []
    main_tracker_ticket = None

    async with httpx.AsyncClient() as client:
        # 1. Fetch the enriched policy
        try:
            policy_response = await client.get("http://mock-git-service:8002/api/get-approved-config/rate-limiting")
            policy_response.raise_for_status()
            policy_data = policy_response.json()
            approved_config = policy_data["approved_config"]
        except httpx.RequestError as e:
            return {"status": "error", "message": f"Could not connect to Git service: {e}"}

        # 2. Fetch running configurations
        try:
            running_configs_response = await client.get("http://mock-config-service:8001/api/get-running-configs/rate-limiting")
            running_configs_response.raise_for_status()
            running_configs = running_configs_response.json()
        except httpx.RequestError as e:
            return {"status": "error", "message": f"Could not connect to Config service: {e}"}

        # 3. Create main tracking ticket
        try:
            main_ticket_body = { "title": f"Compliance Audit: {policy_data['name']}", "body": f"Tracking audit for policy {policy_data['policy_id']}..." }
            main_ticket_response = await client.post("http://mock-ticketing-service:8003/api/create-ticket", json=main_ticket_body)
            main_ticket_response.raise_for_status()
            main_tracker_ticket = main_ticket_response.json().get("ticket_id")
        except httpx.RequestError as e:
            return {"status": "error", "message": f"Could not connect to Ticketing service: {e}"}

        # 4. Loop through services and execute check
        for service in running_configs:
            config = service["config"]
            service_id = service["service_id"]

            if execute_check(config, approved_config):
                print(f"PASS for {service_id}")
                passed_results.append({ "service_id": service_id, "policy_id": policy_data['policy_id'] })
            else:
                print(f"FAILURE found for {service_id}")
                failure_reason = (
                    f"Expected rate_limit_enabled={approved_config.get('rate_limit_enabled')} "
                    f"(got {config.get('rate_limit_enabled')}) AND rate_limit >= {approved_config.get('rate_limit_min')} "
                    f"(got {config.get('rate_limit', 0)})."
                )

                # CORRECTED: Re-implementing the detailed, actionable ticket body
                remediation_text = "\\n".join(policy_data.get('remediation_steps', []))
                child_ticket_body = {
                    "title": f"FIX: {service_id} non-compliant with {policy_data['policy_id']}",
                    "parent_ticket": main_tracker_ticket,
                    "severity": policy_data.get('severity'),
                    "labels": ["compliance", "auto-generated", policy_data.get('service')],
                    "body": f"""
**Service ID:** {service_id}
**Severity:** {policy_data.get('severity')}
**Compliance Policy:** {policy_data.get('name')} ({policy_data.get('policy_id')})
**Framework:** {policy_data.get('compliance_framework')}

**Failure Details:**
{failure_reason}

**Remediation Steps:**
{remediation_text}
"""
                }

                remediation_ticket_id = None
                try:
                    child_ticket_response = await client.post("http://mock-ticketing-service:8003/api/create-ticket", json=child_ticket_body)
                    remediation_ticket_id = child_ticket_response.json().get("ticket_id")
                except httpx.RequestError as e:
                    print(f"Error creating child ticket for {service_id}: {e}")

                failed_results.append({
                    "service_id": service_id, "policy_id": policy_data['policy_id'], "severity": policy_data.get('severity'),
                    "failure_reason": failure_reason, "remediation_ticket": remediation_ticket_id
                })

        # 5. Construct audit results payload
        audit_results = {
            "status": "complete",
            "summary": { "passed": len(passed_results), "failed": len(failed_results), "main_tracker_ticket": main_tracker_ticket },
            "passed_results": passed_results,
            "failed_results": failed_results
        }

        # 6. Get signed attestation
        attestation_token = None
        try:
            attestation_response = await client.post("http://fulcrum-attestor:8004/api/create-attestation", json=audit_results)
            attestation_response.raise_for_status()
            attestation_token = attestation_response.json().get("attestation_token")
            print("Successfully received audit attestation.")
        except httpx.RequestError as e:
            print(f"Error getting attestation: {e}")

        # 7. Construct final response
        final_response = {
            "audit_attestation": attestation_token,
            **audit_results
        }

    print(f"Audit finished. Summary: {final_response['summary']}")
    return final_response
