"""Tests that sample evidence objects conform to schema/evidence.schema.json."""

import json
import os
from pathlib import Path

import pytest
from jsonschema import Draft7Validator

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "schema" / "evidence.schema.json"


@pytest.fixture(scope="module")
def evidence_schema():
    with open(SCHEMA_PATH, "r") as f:
        return json.load(f)


def build_evidence(overrides=None):
    """Build a valid evidence attestation object that conforms to the schema."""
    evidence = {
        "_type": "https://in-toto.io/Statement/v1",
        "subject": [
            {"name": "artifact", "digest": {"sha256": "abc123"}}
        ],
        "predicateType": "https://scoutos.dev/evidence/v1",
        "predicate": {
            "evidence_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
            "collector_name": "aws-iam-password-policy",
            "collection_timestamp": "2025-10-13T19:18:00Z",
            "target_account_id": "123456789012",
            "evidence_payload": {
                "MinimumPasswordLength": 8,
                "RequireSymbols": True,
            },
            "schema_version": "1.0.0",
        },
    }
    if overrides:
        evidence.update(overrides)
    return evidence


def test_schema_file_exists():
    assert SCHEMA_PATH.exists(), f"Schema not found at {SCHEMA_PATH}"


def test_schema_is_valid_json(evidence_schema):
    Draft7Validator.check_schema(evidence_schema)


def test_valid_evidence_passes_validation(evidence_schema):
    evidence = build_evidence()
    validator = Draft7Validator(evidence_schema)
    errors = sorted(validator.iter_errors(evidence), key=lambda e: e.path)
    assert not errors, f"Valid evidence failed validation: {[e.message for e in errors]}"


def test_missing_required_field_fails_validation(evidence_schema):
    # Remove a required predicate field
    evidence = build_evidence()
    del evidence["predicate"]["collector_name"]
    validator = Draft7Validator(evidence_schema)
    errors = list(validator.iter_errors(evidence))
    assert errors, "Expected validation errors for missing required field"


def test_evidence_schema_matches_readme_example(evidence_schema):
    """The example in README.md (evidence payload form) must validate under the schema."""
    sample = {
        "_type": "https://in-toto.io/Statement/v1",
        "subject": [{"name": "artifact", "digest": {"sha256": "deadbeef"}}],
        "predicateType": "https://scoutos.dev/evidence/v1",
        "predicate": {
            "evidence_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
            "collector_name": "aws-iam-password-policy",
            "collection_timestamp": "2025-10-13T19:18:00Z",
            "target_account_id": "123456789012",
            "evidence_payload": {
                "MinimumPasswordLength": 8,
                "RequireSymbols": True,
                "RequireNumbers": True,
                "RequireUppercaseCharacters": True,
                "RequireLowercaseCharacters": True,
                "PasswordReusePrevention": 24,
                "MaxPasswordAge": 90,
            },
            "schema_version": "1.0.0",
        },
    }
    validator = Draft7Validator(evidence_schema)
    errors = list(validator.iter_errors(sample))
    assert not errors, f"Sample evidence failed validation: {[e.message for e in errors]}"
