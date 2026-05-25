import base64
from typing import Any, Dict

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except Exception:  # pragma: no cover
    boto3 = None
    BotoCoreError = ClientError = Exception


def verify(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.kms.verify_signature.verify

    Inputs:
      - keyId: str
      - messageHashHex: str (SHA-256 hex)
      - signatureBase64: str
      - algorithm: str (default RSASSA_PSS_SHA_256)
    """
    if boto3 is None:
        return {"status": "failure", "message": "boto3 not available"}
    key_id = event.get("keyId")
    message_hash_hex = event.get("messageHashHex")
    signature_b64 = event.get("signatureBase64")
    alg = event.get("algorithm", "RSASSA_PSS_SHA_256")
    if not all([key_id, message_hash_hex, signature_b64]):
        return {"status": "failure", "message": "keyId, messageHashHex, signatureBase64 required"}
    try:
        kms = boto3.client("kms")
        resp = kms.verify(
            KeyId=key_id,
            Message=bytes.fromhex(message_hash_hex),
            MessageType="DIGEST",
            Signature=base64.b64decode(signature_b64),
            SigningAlgorithm=alg,
        )
        return {"status": "success", "signatureValid": bool(resp.get("SignatureValid"))}
    except (BotoCoreError, ClientError) as e:
        return {"status": "failure", "message": str(e)}

