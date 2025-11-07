import json
import boto3
import requests
import os
import base64
from in_toto.models.metadata import Metadata
from securesystemslib.signer import CryptoSigner
from securesystemslib.signer._key import SSlibKey
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from securesystemslib.dsse import Envelope

def handler(event, context):
    """
    Lambda handler to process S3 evidence attestations, sign them, and upload to Archivista.
    """
    s3 = boto3.client('s3', region_name=os.environ['AWS_REGION'])
    secretsmanager = boto3.client('secretsmanager', region_name=os.environ['AWS_REGION'])

    # Get the signing key from Secrets Manager
    key_arn = os.environ['SIGNING_KEY_ARN']
    secret = secretsmanager.get_secret_value(SecretId=key_arn)
    private_key_pem = secret['SecretString']

    # Write the key to a file
    key_path = "/tmp/signing_key.pem"
    with open(key_path, "w") as f:
        f.write(private_key_pem)

    # Create the signer
    private_key = load_pem_private_key(private_key_pem.encode('utf-8'), password=None)
    public_key = SSlibKey.from_crypto(private_key.public_key())
    signer = CryptoSigner.from_priv_key_uri(f"file2:{key_path}", public_key)


    for record in event['Records']:
        bucket_name = record['s3']['bucket']['name']
        object_key = record['s3']['object']['key']

        # Download the attestation from S3
        local_attestation_path = f"/tmp/{os.path.basename(object_key)}"
        s3.download_file(bucket_name, object_key, local_attestation_path)

        with open(local_attestation_path, 'r') as f:
            attestation_statement = json.load(f)

        # Create a DSSE envelope and sign it
        payload = json.dumps(attestation_statement).encode('utf-8')
        payload_type = "application/vnd.in-toto+json"

        envelope = Envelope(payload, payload_type, [])
        envelope.sign(signer)

        # Upload the signed attestation to Archivista
        archivista_url = os.environ['ARCHIVISTA_URL']
        headers = {'Content-Type': 'application/json'}
        response = requests.post(f"{archivista_url}/upload", json=envelope.to_dict(), headers=headers)
        response.raise_for_status()

        print(f"Successfully uploaded signed attestation for {object_key} to Archivista.")

    return {
        'statusCode': 200,
        'body': json.dumps('Ingestion complete')
    }
