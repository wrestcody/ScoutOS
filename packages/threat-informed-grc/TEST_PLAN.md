# Vanguard_Agent Test Plan

## Overview

This document outlines the testing protocol for the Vanguard_Agent to ensure its logic is sound and the data transformation process is accurate before deployment. Given the agent's critical role in the GRC ecosystem, this validation is a mandatory step to ensure Mission Assurance.

## Pre-requisites

1.  **Python Environment:** A Python 3.11+ environment is required.
2.  **Dependencies:** The `requests` library must be installed.
    ```bash
    pip install requests
    ```
3.  **Code:** The latest version of the `log_analyzer.py` script from the repository.

## Local Validation Procedure

The primary method for testing the agent's core logic is by executing the `log_analyzer.py` script directly. The script contains a dedicated `if __name__ == '__main__':` block that simulates a Lambda invocation with a representative Continuous Compliance Evidence (CCE) payload.

### Execution Steps

1.  **Navigate to the Repository Root:**
    Open a terminal and change the directory to the root of the `Vanguard_Agent` repository.

2.  **Run the Script:**
    Execute the Python script using the following command:
    ```bash
    python3 log_analyzer.py
    ```

### Expected Output

The script will print the following to the console:

1.  **Local Test Header:**
    ```
    --- Running Local Test ---
    ```
2.  **Log Messages:** A series of log messages from the Lambda handler detailing the execution flow (e.g., "Ingesting and validating CCE payload," "Querying OPA for contextual risk score," etc.).
3.  **Final Enriched Payload:** A header indicating the start of the final payload log. The payload itself is logged by the `send_to_praetorium_nexus` function.
    ```
    --- Final Enriched Payload (Logged during transmission) ---
    ```
4.  **Lambda Handler Result:** The final JSON object that the Lambda function would return upon successful execution.
    ```json
    --- Lambda Handler Result ---
    {
      "statusCode": 200,
      "body": "{\"message\": \"GRC event processed successfully.\"}"
    }
    ```
5.  **Local Test Footer:**
    ```
    --- Local Test Complete ---
    ```

### Validation Criteria

The test is considered successful if:
- The script runs to completion without any unhandled exceptions or errors.
- The log output shows a `refined_risk_score` of **"Critical"** in the final payload, demonstrating that the OPA logic correctly elevated the "High" severity finding based on the "CUI" and "FedRAMP_Critical" tags in the mock payload.
- The `executive_summary` in the payload is coherent and accurately reflects the "Critical" risk level.
- The `lambda_handler` returns a `statusCode` of **200**.

This local test provides a high degree of confidence that the agent's data transformation and enrichment logic is functioning as intended before it is deployed to the AWS environment.
