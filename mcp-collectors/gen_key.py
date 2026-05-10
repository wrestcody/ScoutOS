from securesystemslib.signer import CryptoSigner
import json
import os

def generate_and_save_key():
    # Use securesystemslib's key generation
    from securesystemslib.interface import generate_and_write_ecdsa_keypair

    base_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(base_dir, "test_key")

    # generate an ECDSA private key and write it to test_key
    # The default key generation creates an unencrypted PEM file
    generate_and_write_ecdsa_keypair(key_path)

    print(f"Generated test key at {key_path}")

if __name__ == "__main__":
    generate_and_save_key()
