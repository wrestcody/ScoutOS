import json
import subprocess
import os

def classify_prompt(prompt: str) -> dict:
    """
    Uses the NadirClaw CLI to classify a prompt as 'simple' or 'complex'.
    Returns a dict with 'tier' (either 'simple' or 'complex').
    """
    try:
        # Increase timeout as the first run needs to download/load the sentence-transformers model
        r = subprocess.run(
            ["nadirclaw", "classify", "--format", "json", prompt],
            capture_output=True, text=True, timeout=60
        )
        if r.returncode != 0:
            return {"tier": "complex", "error": (r.stderr or r.stdout).strip()}

        return json.loads(r.stdout.strip())
    except Exception as e:
        return {"tier": "complex", "error": str(e)}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        result = classify_prompt(sys.argv[1])
        print(json.dumps(result))
