import os
from typing import Any, Dict, List

import requests
from requests.auth import HTTPBasicAuth


def get_config(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.bitbucket.get_config.get_config

    Inputs (optional):
      - workspace: str (Bitbucket workspace)

    Secrets via env:
      - BITBUCKET_USERNAME
      - BITBUCKET_APP_PASSWORD
    """
    username = os.getenv("BITBUCKET_USERNAME")
    app_password = os.getenv("BITBUCKET_APP_PASSWORD")
    if not username or not app_password:
        return {"status": "failure", "message": "BITBUCKET_USERNAME/APP_PASSWORD not set"}
    workspace = event.get("workspace") or os.getenv("BITBUCKET_WORKSPACE")
    if not workspace:
        return {"status": "failure", "message": "workspace not provided"}

    auth = HTTPBasicAuth(username, app_password)
    repos: List[Dict[str, Any]] = []
    url = f"https://api.bitbucket.org/2.0/repositories/{workspace}"
    try:
        while url:
            r = requests.get(url, auth=auth, timeout=30)
            if r.status_code != 200:
                return {"status": "failure", "message": f"repos {r.status_code} {r.text}"}
            data = r.json()
            repos.extend(data.get("values", []))
            url = data.get("next")

        # Fetch branch restrictions for each repo (limited sample)
        out = []
        for repo in repos[:100]:
            slug = repo.get("slug") or repo.get("name")
            if not slug:
                continue
            br = requests.get(
                f"https://api.bitbucket.org/2.0/repositories/{workspace}/{slug}/branch-restrictions",
                auth=auth,
                timeout=30,
            )
            br_json = br.json() if br.status_code == 200 else {"error": br.text}
            out.append({
                "repo": slug,
                "is_private": repo.get("is_private"),
                "branch_restrictions": br_json,
            })

        return {"status": "success", "config": {"workspace": workspace, "repos": out}}
    except Exception as e:
        return {"status": "failure", "message": str(e)}

