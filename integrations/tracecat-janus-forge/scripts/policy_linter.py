#!/usr/bin/env python3
import json
import sys
from pathlib import Path


REQUIRED = [
    "policyId",
    "description",
    "frameworks",
    "targetPlatform",
    "targetResource",
    "rule",
    "severity",
]


def lint(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        doc = json.loads(path.read_text())
    except Exception as e:
        return [f"{path}: invalid JSON: {e}"]

    for k in REQUIRED:
        if k not in doc:
            errors.append(f"{path}: missing required field '{k}'")

    rule = doc.get("rule", {})
    for rk in ("field", "operator", "expectedValue"):
        if rk not in rule:
            errors.append(f"{path}: rule missing '{rk}'")

    # simple id shape check
    pid = doc.get("policyId", "")
    if not pid or not pid.upper() == pid:
        errors.append(f"{path}: policyId should be UPPERCASE like AWS-S3-001")

    return errors


def main():
    paths = [Path(p) for p in sys.argv[1:]]
    if not paths:
        print("Usage: policy_linter.py <policy.json> [more.json]", file=sys.stderr)
        sys.exit(2)
    all_errors: list[str] = []
    for p in paths:
        all_errors.extend(lint(p))
    if all_errors:
        print("\n".join(all_errors))
        sys.exit(1)
    print("OK: All policies linted cleanly")


if __name__ == "__main__":
    main()

