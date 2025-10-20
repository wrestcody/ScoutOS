import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

# Import the FastAPI app
from workbench.backend.main import app
from workbench.backend.models import ApiRequest, CollectorConfig

client = TestClient(app)


def test_read_root():
    """
    Test the root endpoint to ensure the server is running.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the scoutos Collector Workbench Backend!"}


@patch("workbench.backend.main.requests.request")
def test_proxy_endpoint_success(mock_request):
    """
    Test the /proxy endpoint's happy path.
    """
    # Mock the response from the external API
    mock_request.return_value.status_code = 200
    mock_request.return_value.json.return_value = {"data": "some evidence"}

    api_call = {
        "method": "GET",
        "url": "https://api.example.com/data",
        "headers": {"Authorization": "Bearer test-token"}
    }

    response = client.post("/proxy", json=api_call)

    assert response.status_code == 200
    assert response.json() == {"data": "some evidence"}
    mock_request.assert_called_once_with(
        method="GET",
        url="https://api.example.com/data",
        headers={"Authorization": "Bearer test-token"},
        params={},
        json=None
    )


def test_build_endpoint():
    """
    Test the /build endpoint to ensure it generates a collector pack.
    """
    collector_config = {
        "collector_name": "my-test-collector",
        "api_request": {
            "method": "GET",
            "url": "https://api.test.com/things"
        },
        "transformations": [],
        "output_mapping": {}
    }

    response = client.post("/build", json=collector_config)

    assert response.status_code == 200
    pack = response.json()

    assert pack["manifest"]["name"] == "my-test-collector"
    assert "import requests" in pack["python_code"]
    assert 'COLLECTOR_NAME = "my-test-collector"' in pack["python_code"]
    assert "# Terraform code will be generated here." in pack["terraform_code"]