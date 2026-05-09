#!/bin/bash

echo "[INFO] ScoutOS Pre-flight Sequence Initiated."

# Check if SOPS is installed
if ! command -v sops &> /dev/null
then
    echo "[WARNING] SOPS could not be found. Bypassing JIT decryption for local dev."
    # Fallback logic for pure local testing if SOPS isn't available
    if [ -f ".env.template" ] && [ ! -f ".env" ]; then
        echo "[INFO] Copying .env.template to .env for local testing."
        cp .env.template .env
    fi
else
    echo "[INFO] SOPS detected. Attempting JIT decryption of .env.enc..."

    # In a real environment, this would use age keys:
    # export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt

    # Decrypt to .env file (or parse directly into memory to avoid disk write)
    if [ -f ".env.enc" ]; then
        # For safety in local dev, we might just decrypt it to a file.
        # In a hardened prod setup, you'd export these to env vars directly.
        sops -d .env.enc > .env
        echo "[INFO] Decryption successful. Armor logic engaging."
    else
        echo "[WARNING] .env.enc not found."
    fi
fi

echo "[INFO] Launching ScoutOS Core Engine..."
# Since this script lives in the root of scoutos-hub, run dev
npm run dev
