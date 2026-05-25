from fastapi import FastAPI

app = FastAPI()

@app.get("/api/get-approved-config/rate-limiting")
async def get_approved_config():
    """
    Returns the enriched 'golden record' policy for API Gateway rate limiting.
    """
    return {
        "policy_id": "RL-001-v2",
        "name": "Standard Rate Limiting Policy",
        "service": "API Gateway",
        "severity": "High",
        "compliance_framework": "CIS-AWS-1.2.4",
        "remediation_steps": [
            "1. Navigate to the API Gateway console.",
            "2. Select the API and navigate to the 'Stages' tab.",
            "3. Enable 'Default Throttling' and set the Rate to at least 100."
        ],
        "approved_config": {
            "rate_limit_enabled": True,
            "rate_limit_min": 100
        }
    }
