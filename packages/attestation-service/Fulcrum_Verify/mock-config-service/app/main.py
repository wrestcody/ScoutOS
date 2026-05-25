from fastapi import FastAPI

app = FastAPI()

@app.get("/api/get-running-configs/rate-limiting")
async def get_running_configs():
    return [
        {
            "service_id": "api-gateway-prod-123",
            "config": {"rate_limit_enabled": True, "rate_limit": 500, "burst_limit": 1000}
        },
        {
            "service_id": "old-api-legacy-456",
            "config": {"rate_limit_enabled": False, "rate_limit": 0, "burst_limit": 0}
        },
        {
            "service_id": "new-service-beta-789",
            "config": {"rate_limit_enabled": True, "rate_limit": 50, "burst_limit": 100}
        }
    ]
