# Hosting The Janus Forge Integrations on AWS ECS (Fargate)

## Overview
This guide shows how to package the Tracecat custom integrations as a container and run them on ECS Fargate with IAM roles and SSM/Secrets Manager for secrets.

## Build & Push
```bash
aws ecr create-repository --repository-name janus-forge-integrations || true
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
IMAGE=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/janus-forge-integrations:latest
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

docker build -t janus-forge-integrations .
docker tag janus-forge-integrations:latest $IMAGE
docker push $IMAGE
```

## Task Definition
- See `infra/ecs/task-def.example.json` and customize ARNs, region, log group, and secrets parameters.

## IAM
- Task Role: permit read-only to SSM parameters/Secrets Manager keys you use, and any AWS APIs your UDFs need (e.g., `iam:ListUsers`, `auditmanager:ListAssessmentReports`).
- Execution Role: standard `ecsTaskExecutionRole` for pulling from ECR and writing logs.

## Networking
- Use `awsvpc` with private subnets + NAT for egress. Attach a security group allowing outbound HTTPS.

## Secrets
- Store credentials in Systems Manager Parameter Store (recommended) or Secrets Manager and reference in the task definition `secrets` array.

## Tracecat Integration
- If Tracecat runs elsewhere (EKS/ECS/VM): mount or fetch this image to load custom integrations. Alternatively, publish the package to an internal PyPI and install at Tracecat startup.

## Observability
- Logs ship to CloudWatch Logs group `/ecs/janus-forge-integrations` from the task definition. Also use `tools.janus.sumologic.log_event` for run summaries.

## Rollout
- Use blue/green by creating a new task definition revision and updating the service.
- Keep schedules disabled by default; enable in prod via Tracecat UI after validation.