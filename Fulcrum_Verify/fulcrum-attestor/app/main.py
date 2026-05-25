import jwt
from fastapi import FastAPI, Request
from datetime import datetime, timezone

app = FastAPI()

# IMPORTANT: In a real application, this should be loaded from a secure
# configuration manager (like AWS Secrets Manager or HashiCorp Vault),
# not hardcoded.
ATTESTOR_SECRET_KEY = "a-very-secret-key-for-poc"

@app.post("/api/create-attestation")
async def create_attestation(request: Request):
    """
    Receives a JSON payload, enriches it with a timestamp, and returns a
    signed JSON Web Token (JWT) as a verifiable attestation.
    """
    # Get the original audit results from the request body
    original_payload = await request.json()

    # Create a new payload that includes the original data plus the issuance time
    attestation_payload = {
        **original_payload,
        'iat': datetime.now(timezone.utc).isoformat()
    }

    # Encode the payload into a JWT
    token = jwt.encode(
        attestation_payload,
        ATTESTOR_SECRET_KEY,
        algorithm="HS256"
    )

    return {"attestation_token": token}
