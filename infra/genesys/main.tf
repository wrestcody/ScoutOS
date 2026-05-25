terraform {
  required_version = ">= 1.6.0"
  required_providers {
    genesyscloud = {
      source  = "MyPureCloud/genesyscloud"
      version = ">= 1.49.0"
    }
  }
}

provider "genesyscloud" {
  # Configure with environment variables or provider arguments.
  # See: https://registry.terraform.io/providers/MyPureCloud/genesyscloud/latest
  # Examples (env-based):
  # export GENESYSCLOUD_OAUTHCLIENT_ID=...
  # export GENESYSCLOUD_OAUTHCLIENT_SECRET=...
  # export GENESYSCLOUD_REGION=us-east-1 # e.g., us-east-1, eu-central-1
}

# Scaffold only: add resources/modules for flows, data actions, queues, data tables.

