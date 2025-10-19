# --------------------------------------------------------------------------------------------------
# AWS GuardDuty Configuration
# --------------------------------------------------------------------------------------------------
resource "aws_guardduty_detector" "scoutos" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }
}

# --------------------------------------------------------------------------------------------------
# AWS IAM Access Analyzer Configuration
# --------------------------------------------------------------------------------------------------
resource "aws_accessanalyzer_analyzer" "scoutos" {
  analyzer_name = "scoutos-account-analyzer"
  type          = "ACCOUNT"
}

# --------------------------------------------------------------------------------------------------
# Amazon Macie Configuration
# --------------------------------------------------------------------------------------------------
resource "aws_macie2_account" "scoutos" {
  status = "ENABLED"
}

resource "aws_macie2_classification_job" "evidence_scan" {
  job_type                  = "ONE_TIME" # Can be changed to SCHEDULED
  name                      = "scoutos-evidence-bucket-pii-scan"
  s3_job_definition {
    bucket_definitions {
      account_id = data.aws_caller_identity.current.account_id
      buckets    = [module.evidence_bucket.bucket_id]
    }
  }
  sampling_percentage       = 100
  schedule_frequency {
    daily_schedule = true
  }

  depends_on = [aws_macie2_account.scoutos]
}

data "aws_caller_identity" "current" {}