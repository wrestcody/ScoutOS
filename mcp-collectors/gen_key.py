from securesystemslib.signer import CryptoSigner
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import os

def generate_and_save_key():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(base_dir, "test_key.pem")

    private_key = ec.generate_private_key(ec.SECP256R1())
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    with open(key_path, 'wb') as f:
        f.write(pem)

    print(f"Generated test key at {key_path}")

if __name__ == "__main__":
    generate_and_save_key()
