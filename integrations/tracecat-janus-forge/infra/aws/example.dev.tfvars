aws_region = "us-east-1"
project_name = "genesys-grc-poc"
environment = "dev"

okta_token_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:okta-token"
okta_org = "acme.okta.com"

jira_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:jira-cred"
jira_base_url = "https://yourdomain.atlassian.net"

vendor_score_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:vendor-score"
vendor_score_provider = "securityscorecard"

workday_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:workday"

evidence_webhook_secret_arn = ""
evidence_webhook_url = ""

gc_oauth_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:gc-oauth"
gc_region = "us-east-1"
gc_login_url = ""

evidence_s3_bucket = "your-evidence-bucket"
evidence_s3_prefix = "evidence/"

training_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:training"
training_base_url = "https://training.example.com"

gc_summary_api_url = "https://api.usw2.pure.cloud/ai/copilot/summaries"
gc_bulk_export_base = "https://api.usw2.pure.cloud/api/v2/externalcontacts/bulk"

bedrock_model_id = "anthropic.claude-3-haiku-20240307-v1:0"
sumo_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:sumo-keys"
sumo_base_url = "https://api.us2.sumologic.com"
sumo_source_category = "genesys-cloud-logs"

sumo_http_endpoint = "https://endpoint1.collection.sumologic.com/receiver/v1/http/abc123"
log_retention_days = 30
