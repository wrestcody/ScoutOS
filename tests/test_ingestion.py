import unittest
import json
import os
import boto3
from moto import mock_aws
import responses
import sys
import base64
from securesystemslib.signer import CryptoSigner, SSlibKey
from securesystemslib.dsse import Envelope
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

# Add the parent directory to the Python path to allow importing handler
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from witness_ingestion.handler import handler

@mock_aws
class TestIngestionLambda(unittest.TestCase):

    def setUp(self):
        """
        Set up mock AWS resources and dummy credentials.
        """
        os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
        os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
        os.environ['AWS_SECURITY_TOKEN'] = 'testing'
        os.environ['AWS_SESSION_TOKEN'] = 'testing'
        os.environ['AWS_REGION'] = 'us-east-1'
        os.environ['ARCHIVISTA_URL'] = 'https://archivista.testifysec.io'

        self.s3_client = boto3.client('s3', region_name='us-east-1')
        self.secretsmanager_client = boto3.client('secretsmanager', region_name='us-east-1')

        self.bucket_name = 'test-evidence-bucket'
        self.s3_client.create_bucket(Bucket=self.bucket_name)

        # Create a dummy signing key and store it in Secrets Manager
        self.secret_name = "test-signing-key"
        private_key = ed25519.Ed25519PrivateKey.generate()
        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        self.public_key = SSlibKey.from_crypto(private_key.public_key())
        secret = self.secretsmanager_client.create_secret(Name=self.secret_name, SecretString=pem.decode('utf-8'))
        os.environ['SIGNING_KEY_ARN'] = secret['ARN']


    def _create_s3_event(self, bucket, key):
        """
        Helper function to create an S3 event.
        """
        return {
            'Records': [{
                's3': {
                    'bucket': {'name': bucket},
                    'object': {'key': key}
                }
            }]
        }

    @responses.activate
    def test_handler(self):
        """
        Test the handler with a sample attestation.
        """
        # Mock the Archivista API endpoint
        responses.add(responses.POST, 'https://archivista.testifysec.io/upload', json={'message': 'success'}, status=200)

        # Create a sample attestation
        attestation_content = {
            "_type": "https://in-toto.io/Statement/v1",
            "subject": [{"name": "test-artifact", "digest": {"sha256": "deadbeef"}}],
            "predicateType": "https://scoutos.dev/evidence/v1",
            "predicate": {"evidence_id": "test-evidence"}
        }
        object_key = 'evidence/test-attestation.json'
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=object_key,
            Body=json.dumps(attestation_content)
        )

        event = self._create_s3_event(self.bucket_name, object_key)
        result = handler(event, None)

        self.assertEqual(result['statusCode'], 200)
        self.assertEqual(len(responses.calls), 1)

        # Verify the DSSE envelope
        envelope_dict = json.loads(responses.calls[0].request.body)
        envelope = Envelope.from_dict(envelope_dict)

        # Verify the signature
        self.assertTrue(envelope.verify([self.public_key], 1))

        # Verify the payload is the original attestation
        payload = json.loads(envelope.payload)
        self.assertEqual(payload, attestation_content)


if __name__ == '__main__':
    unittest.main()
