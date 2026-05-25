variable "sumo_http_endpoint" {
  description = "Sumo Logic HTTP Source endpoint URL for Firehose"
  type        = string
  default     = ""
}

resource "aws_kinesis_firehose_delivery_stream" "genesys_to_sumo" {
  name        = "${var.project_name}-genesys-to-sumo-${var.environment}"
  destination = "http_endpoint"

  http_endpoint_configuration {
    url                = var.sumo_http_endpoint
    name               = "sumo-http"
    buffering_size     = 5
    buffering_interval = 60
    s3_backup_mode     = "FailedDataOnly"
    role_arn           = aws_iam_role.firehose_role.arn
    access_key         = null
  }

  s3_configuration {
    role_arn           = aws_iam_role.firehose_role.arn
    bucket_arn         = aws_s3_bucket.firehose_backup.arn
    buffering_size     = 5
    buffering_interval = 300
    compression_format = "GZIP"
  }
}

resource "aws_s3_bucket" "firehose_backup" {
  bucket = "${var.project_name}-firehose-backup-${var.environment}-${var.aws_region}"
  force_destroy = true
}

data "aws_iam_policy_document" "firehose_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service", identifiers = ["firehose.amazonaws.com"] }
  }
}

resource "aws_iam_role" "firehose_role" {
  name               = "${var.project_name}-firehose-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.firehose_assume.json
}

data "aws_iam_policy_document" "firehose_policy" {
  statement { actions = ["s3:PutObject", "s3:AbortMultipartUpload", "s3:ListBucket", "s3:GetBucketLocation"], resources = [aws_s3_bucket.firehose_backup.arn, "${aws_s3_bucket.firehose_backup.arn}/*"] }
}

resource "aws_iam_policy" "firehose_policy" {
  name   = "${var.project_name}-firehose-policy-${var.environment}"
  policy = data.aws_iam_policy_document.firehose_policy.json
}

resource "aws_iam_role_policy_attachment" "firehose_attach" {
  role       = aws_iam_role.firehose_role.name
  policy_arn = aws_iam_policy.firehose_policy.arn
}

resource "aws_cloudwatch_event_rule" "genesys_partner_events" {
  name        = "${var.project_name}-genesys-partner-${var.environment}"
  event_pattern = <<EOF
{
  "source": ["aws.partner/genesys.cloud"]
}
EOF
}

resource "aws_cloudwatch_event_target" "events_to_firehose" {
  rule      = aws_cloudwatch_event_rule.genesys_partner_events.name
  target_id = "firehose"
  arn       = aws_kinesis_firehose_delivery_stream.genesys_to_sumo.arn
}

resource "aws_lambda_permission" "allow_events_firehose" {
  statement_id  = "AllowEventToFirehose"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sumo_evidence_get.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.genesys_partner_events.arn
}

