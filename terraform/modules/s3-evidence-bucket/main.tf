# --------------------------------------------------------------------------------------------------
# KMS Key for S3 Bucket Encryption
# --------------------------------------------------------------------------------------------------
resource "aws_kms_key" "evidence_key" {
  description             = "KMS key for encrypting scoutos evidence objects"
  enable_key_rotation     = true
  deletion_window_in_days = 30 # A safety measure to prevent accidental deletion

  tags = {
    Name      = "scoutos-evidence-key"
    ManagedBy = "Terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "log_bucket_pab" {
  bucket = aws_s3_bucket.log_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "log_bucket_versioning" {
  bucket = aws_s3_bucket.log_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "log_bucket_sse" {
  bucket = aws_s3_bucket.log_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.evidence_key.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_kms_alias" "evidence_key_alias" {
  name          = var.kms_key_alias
  target_key_id = aws_kms_key.evidence_key.id
}

# --------------------------------------------------------------------------------------------------
# S3 Bucket for Evidence Storage
# --------------------------------------------------------------------------------------------------
resource "aws_s3_bucket" "log_bucket" { # tfsec:ignore:aws-s3-enable-bucket-logging
  bucket = "${var.bucket_name}-logs"

  tags = {
    Name      = "${var.bucket_name}-logs"
    ManagedBy = "Terraform"
  }
}

resource "aws_s3_bucket" "evidence_bucket" {
  bucket = var.bucket_name

  tags = {
    Name      = var.bucket_name
    ManagedBy = "Terraform"
  }
}

# --------------------------------------------------------------------------------------------------
# S3 Bucket Configuration
# --------------------------------------------------------------------------------------------------
resource "aws_s3_bucket_versioning" "evidence_bucket_versioning" {
  bucket = aws_s3_bucket.evidence_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence_bucket_sse" {
  bucket = aws_s3_bucket.evidence_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.evidence_key.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_object_lock_configuration" "evidence_bucket_object_lock" {
  bucket = aws_s3_bucket.evidence_bucket.id

  object_lock_configuration {
    object_lock_enabled = "Enabled"
  }

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 365
    }
  }
}

resource "aws_s3_bucket_logging" "evidence_bucket_logging" {
  bucket = aws_s3_bucket.evidence_bucket.id

  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "log/"
}

resource "aws_s3_bucket_public_access_block" "evidence_bucket_pab" {
  bucket = aws_s3_bucket.evidence_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --------------------------------------------------------------------------------------------------
# S3 Bucket Policy
# --------------------------------------------------------------------------------------------------
resource "aws_s3_bucket_policy" "evidence_bucket_policy" {
  bucket = aws_s3_bucket.evidence_bucket.id
  policy = data.aws_iam_policy_document.evidence_bucket_policy_doc.json
}

data "aws_iam_policy_document" "evidence_bucket_policy_doc" {
  # Deny all actions if not over HTTPS
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.evidence_bucket.arn,
      "${aws_s3_bucket.evidence_bucket.arn}/*",
    ]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  # Deny deletion of objects or the bucket itself
  # This is a critical control for immutability.
  # Note: A more sophisticated setup might involve a break-glass role.
  statement {
    sid    = "DenyObjectDelete"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions = [
      "s3:DeleteObject",
      "s3:DeleteObjectVersion"
    ]
    resources = [
      "${aws_s3_bucket.evidence_bucket.arn}/*",
    ]
  }
}