# ScoutOS

An extensible, secure framework for collecting compliance and security evidence
from cloud and SaaS platforms. Collectors fetch data, normalize it into a
standardized evidence object, and store it in an immutable evidence data lake.

## Overview

ScoutOS is built around three ideas:

- **Collectors** — Python Lambda functions that connect to an API, fetch data,
  and format it into a standardized evidence object.
- **Evidence Data Lake** — an immutable S3 bucket where all collected evidence
  is stored securely, signed via in-toto attestations, and uploaded to
  [Archivista](https://docs.testifysec.com/archivista/).
- **Schema** — every piece of evidence conforms to `schema/evidence.schema.json`,
  keeping the data lake consistent and queryable.

## Architecture

```
┌────────────┐   ┌─────────────────┐   ┌──────────────────────┐   ┌───────────┐
│ Collector  │──▶│ Evidence Data   │──▶│ Witness Ingestion    │──▶│ Archivista│
│ (Lambda)   │   │ Lake (S3)       │   │ Lambda (sign + push) │   │ (DSL)     │
└────────────┘   └─────────────────┘   └──────────────────────┘   └───────────┘
```

- **Collectors** write raw evidence JSON to S3.
- The **Witness Ingestion** Lambda is triggered on new objects, signs them with
  an in-toto DSSE envelope, and uploads the signed attestation to Archivista.
- **Terraform** (`terraform/`) provisions the VPC, S3 bucket, IAM boundary, and
  the Lambda functions.

## Repository Layout

```
collectors/            Collector modules (Python + Terraform)
  aws_iam/             AWS IAM password policy collector
  github/              GitHub branch protection collector
grc-controls-witness/  OPA/Rego policies + GRC control witness examples
schema/                evidence.schema.json (JSON Schema draft-07)
terraform/             Infrastructure-as-code for the evidence lake
tests/                 pytest suite
witness_ingestion/     Signing + upload Lambda
workbench/             (future) collector authoring UI
scoutos-hub/           Web UI dashboard (frontend)
```

## Prerequisites

- Python 3.10+
- Terraform 1.x
- An AWS account
- (Optional) A running [Archivista](https://docs.testifysec.com/archivista/) instance

## Quick Start

### 1. Install Python dependencies

```bash
pip install -e ".[dev]"
```

### 2. Run the tests

```bash
pytest
```

This validates sample evidence against the schema and exercises the collectors
against mocked AWS services.

### 3. Worked example: run the AWS IAM collector

```bash
# Set the environment the collector expects
export EVIDENCE_BUCKET=scoutos-evidence-store-12345
export TARGET_ACCOUNT_ID=123456789012

# Run it with a mocked AWS environment (see tests for the pattern):
python -c "
from collectors.aws_iam.collector import handler
print(handler({}, None))
"
```

The collector writes a JSON evidence object to
`s3://<bucket>/aws-iam-password-policy/<account_id>/<evidence_id>.json`.

### 4. Deploy the infrastructure

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # fill in real values
terraform init
terraform plan
terraform apply
```

### 5. Add a new collector

Copy the pattern in `collectors/aws_iam/`:

1. Create `collectors/<name>/collector.py` implementing a `handler(event, context)`
   that produces a valid evidence object.
2. Add a `terraform.tf` / `versions.tf` module for the Lambda.
3. Wire it into `terraform/main.tf`.
4. Add a test under `tests/collectors/`.

## Deployment Boundaries

- Collectors run in a private VPC with an egress-only security group.
- Every collector role is constrained by a permissions boundary.
- The S3 evidence bucket is immutable and versioned; writes are restricted to
  collector roles.
- Evidence is signed in-toto before leaving the account.

## Teardown

```bash
cd terraform
terraform destroy
```

This removes all provisioned resources (VPC, bucket, Lambdas, IAM roles).

## License

MIT — see [LICENSE](LICENSE).
