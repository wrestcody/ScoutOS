# GRC Controls for Witness

This repository contains the compliance policies for the `scoutos` project, to be used with the `witness` tool.

## Structure

Each control is defined by two files:

*   A Rego policy file (`.rego`) that contains the logic for the control.
*   A Witness policy file (`.json`) that configures Witness to apply the Rego policy to the appropriate attestations.

## Updating the Public Key

The Witness policy files contain a placeholder for the public key of the signer. To update the policy with the correct public key, run the following command in the `terraform` directory:

```
terraform output -raw public_key
```

This will output the PEM-encoded public key. You will need to base64 encode this key and then update the `key` field in the `publickeys` section of the policy file. You will also need to calculate the sha256sum of the public key and update the `keyid` and `publickeyid` fields.

## Controls

*   **IAM Password Policy**: Ensures that the AWS IAM password policy meets the minimum length requirement of 14 characters.
