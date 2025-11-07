resource "aws_s3_bucket" "evidence_bucket" {
  bucket = "scoutos-evidence-bucket"
}

resource "aws_secretsmanager_secret" "signing_key" {
  name = "scoutos-signing-key"
}

resource "aws_secretsmanager_secret_version" "signing_key_version" {
  secret_id     = aws_secretsmanager_secret.signing_key.id
  secret_string = "placeholder" # In a real-world scenario, generate and store a secure key
}

resource "aws_iam_role" "ingestion_lambda_role" {
  name = "ingestion-lambda-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "ingestion_lambda_policy" {
  name        = "ingestion-lambda-policy"
  description = "Policy for the scoutos ingestion Lambda function"

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Action   = [
          "s3:GetObject"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.evidence_bucket.arn}/*"
      },
      {
        Action   = [
          "secretsmanager:GetSecretValue"
        ]
        Effect   = "Allow"
        Resource = aws_secretsmanager_secret.signing_key.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ingestion_lambda_attachment" {
  role       = aws_iam_role.ingestion_lambda_role.name
  policy_arn = aws_iam_policy.ingestion_lambda_policy.arn
}

resource "aws_lambda_function" "ingestion_lambda" {
  function_name = "scoutos-ingestion-lambda"
  role          = aws_iam_role.ingestion_lambda_role.arn
  handler       = "handler.handler"
  runtime       = "python3.9"
  filename      = "witness_ingestion.zip"

  environment {
    variables = {
      ARCHIVISTA_URL   = "https://archivista.testifysec.io"
      SIGNING_KEY_ARN = aws_secretsmanager_secret.signing_key.arn
    }
  }
}

resource "aws_s3_bucket_notification" "evidence_bucket_notification" {
  bucket = aws_s3_bucket.evidence_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.ingestion_lambda.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "evidence/"
  }
}
