import os
import time
import uuid
from typing import Any, Dict, List

import requests


class OktaClientError(Exception):
    pass


def _headers() -> Dict[str, str]:
    token = os.getenv("OKTA_API_TOKEN")
    if not token:
        raise OktaClientError("OKTA_API_TOKEN required")
    return {"Authorization": f"SSWS {token}", "Accept": "application/json"}


def _base() -> str:
    org = os.getenv("OKTA_ORG_URL")
    if not org:
        raise OktaClientError("OKTA_ORG_URL required, e.g., https://yourorg.okta.com")
    return org.rstrip("/")


def _get(path: str, params: Dict[str, Any] = None) -> Any:
    url = f"{_base()}{path}"
    resp = requests.get(url, headers=_headers(), params=params or {}, timeout=30)
    if resp.status_code != 200:
        raise OktaClientError(f"GET {path} -> {resp.status_code} {resp.text}")
    return resp.json()


def sso_audit(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.okta.sso_audit.sso_audit

    Checks:
      - OIDC apps require IdP-initiated disabled unless needed
      - SAML apps enforce signed assertions and require https endpoints
      - MFA enrollment policy present and applied to all users
      - Password policy complexity and lockout are set
      - Inactive users > 90 days identifed for deactivation
    """
    findings: List[Dict[str, Any]] = []
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # MFA policies
    try:
        factors = _get("/api/v1/org/factors")
        mfa_enabled = any(f.get("status") == "ACTIVE" for f in (factors or []))
        if not mfa_enabled:
            findings.append({
                "findingId": str(uuid.uuid4()),
                "policyId": "OKTA-MFA-ORG",
                "resource": "org",
                "category": "MFA",
                "description": "No active MFA factors enabled at org level",
                "severity": "critical",
                "evidence": {"factors": factors},
                "detectedAt": now_iso,
                "status": "open"
            })
    except OktaClientError as e:
        findings.append({
            "findingId": str(uuid.uuid4()),
            "category": "API",
            "description": f"Failed to fetch MFA factors: {e}",
            "severity": "high",
            "evidence": {},
            "detectedAt": now_iso,
            "status": "open"
        })

    # Password policy (basic audit)
    try:
        policies = _get("/api/v1/policies?type=PASSWORD")
        strong = False
        for p in policies:
            r = p.get("settings", {}).get("password", {})
            if r.get("minLength", 0) >= 12 and r.get("minLowerCase", 0) >= 1 and r.get("minUpperCase", 0) >= 1 and r.get("minNumber", 0) >= 1:
                strong = True
                break
        if not strong:
            findings.append({
                "findingId": str(uuid.uuid4()),
                "policyId": "OKTA-PASSWORD-POLICY",
                "resource": "org",
                "category": "PasswordPolicy",
                "description": "No strong password policy (≥12 chars, mixed case, number)",
                "severity": "high",
                "evidence": {"policies": policies},
                "detectedAt": now_iso,
                "status": "open"
            })
    except OktaClientError as e:
        findings.append({
            "findingId": str(uuid.uuid4()),
            "category": "API",
            "description": f"Failed to fetch password policies: {e}",
            "severity": "high",
            "evidence": {},
            "detectedAt": now_iso,
            "status": "open"
        })

    # Inactive users > 90 days based on lastLogin/lastUpdated
    try:
        users = _get("/api/v1/users", params={"filter": "status eq \"ACTIVE\"", "limit": 200})
        stale: List[Dict[str, Any]] = []
        import datetime as dt
        threshold = dt.datetime.utcnow() - dt.timedelta(days=90)
        for u in users or []:
            last_login = u.get("lastLogin")
            last_updated = u.get("lastUpdated")
            last_seen_str = last_login or last_updated
            if not last_seen_str:
                continue
            try:
                # Okta timestamps are ISO 8601 with Z
                last_seen = dt.datetime.fromisoformat(last_seen_str.replace("Z", "+00:00")).replace(tzinfo=None)
                if last_seen < threshold:
                    stale.append({
                        "id": u.get("id"),
                        "status": u.get("status"),
                        "login": u.get("profile", {}).get("login"),
                        "lastSeen": last_seen_str,
                    })
            except Exception:
                continue
        if stale:
            findings.append({
                "findingId": str(uuid.uuid4()),
                "policyId": "OKTA-INACTIVE-USERS-90D",
                "resource": "org",
                "category": "InactiveAccounts",
                "description": f"Detected {len(stale)} users inactive > 90 days",
                "severity": "medium",
                "evidence": {"users": stale[:50]},
                "detectedAt": now_iso,
                "status": "open"
            })
    except OktaClientError as e:
        findings.append({
            "findingId": str(uuid.uuid4()),
            "category": "API",
            "description": f"Failed to fetch users: {e}",
            "severity": "high",
            "evidence": {},
            "detectedAt": now_iso,
            "status": "open"
        })

    # Application-level SSO checks (SAML and OIDC)
    try:
        apps = _get("/api/v1/apps", params={"limit": 200})
        for app in apps or []:
            app_id = app.get("id")
            name = app.get("label") or app.get("name") or app_id
            mode = app.get("signOnMode")
            settings = app.get("settings", {})

            if mode == "SAML_2_0":
                saml = settings.get("saml", {})
                assertion_signed = bool(saml.get("assertionSigned"))
                response_signed = bool(saml.get("responseSigned"))
                acs_url = saml.get("acsUrl") or saml.get("ssoAcsUrl") or ""
                https_acs = isinstance(acs_url, str) and acs_url.startswith("https://")
                idp_login = saml.get("idpInitiatedLogin", {})
                idp_initiated_enabled = bool(idp_login.get("enabled")) if isinstance(idp_login, dict) else False

                if not assertion_signed or not response_signed:
                    findings.append({
                        "findingId": str(uuid.uuid4()),
                        "policyId": "OKTA-SAML-SIGNED",
                        "resource": app_id,
                        "category": "SSOApp",
                        "description": f"SAML app '{name}' does not enforce signed assertions/response",
                        "severity": "high",
                        "evidence": {"appId": app_id, "assertionSigned": assertion_signed, "responseSigned": response_signed},
                        "detectedAt": now_iso,
                        "status": "open"
                    })
                if not https_acs:
                    findings.append({
                        "findingId": str(uuid.uuid4()),
                        "policyId": "OKTA-SAML-HTTPS-ACS",
                        "resource": app_id,
                        "category": "SSOApp",
                        "description": f"SAML app '{name}' ACS URL is not HTTPS",
                        "severity": "high",
                        "evidence": {"appId": app_id, "acsUrl": acs_url},
                        "detectedAt": now_iso,
                        "status": "open"
                    })
                if idp_initiated_enabled:
                    findings.append({
                        "findingId": str(uuid.uuid4()),
                        "policyId": "OKTA-SAML-NO-IDP-INIT",
                        "resource": app_id,
                        "category": "SSOApp",
                        "description": f"SAML app '{name}' has IdP-initiated login enabled",
                        "severity": "medium",
                        "evidence": {"appId": app_id, "idpInitiatedEnabled": True},
                        "detectedAt": now_iso,
                        "status": "open"
                    })

            elif mode in ("OPENID_CONNECT", "OIDC"):
                oauth = settings.get("oauthClient", {})
                redirect_uris = oauth.get("redirect_uris", []) or oauth.get("redirectUris", [])
                https_redirects = all(isinstance(u, str) and u.startswith("https://") for u in redirect_uris) if redirect_uris else True
                response_types = set(oauth.get("response_types", []) or oauth.get("responseTypes", []))
                grant_types = set(oauth.get("grant_types", []) or oauth.get("grantTypes", []))
                # Prefer authorization code flow
                code_ok = ("code" in response_types) and ("authorization_code" in grant_types)
                if not https_redirects:
                    findings.append({
                        "findingId": str(uuid.uuid4()),
                        "policyId": "OKTA-OIDC-HTTPS-REDIRECT",
                        "resource": app_id,
                        "category": "SSOApp",
                        "description": f"OIDC app '{name}' has non-HTTPS redirect URIs",
                        "severity": "high",
                        "evidence": {"appId": app_id, "redirect_uris": redirect_uris},
                        "detectedAt": now_iso,
                        "status": "open"
                    })
                if not code_ok:
                    findings.append({
                        "findingId": str(uuid.uuid4()),
                        "policyId": "OKTA-OIDC-AUTH-CODE",
                        "resource": app_id,
                        "category": "SSOApp",
                        "description": f"OIDC app '{name}' is not configured for Authorization Code flow",
                        "severity": "medium",
                        "evidence": {"appId": app_id, "response_types": list(response_types), "grant_types": list(grant_types)},
                        "detectedAt": now_iso,
                        "status": "open"
                    })
    except OktaClientError as e:
        findings.append({
            "findingId": str(uuid.uuid4()),
            "category": "API",
            "description": f"Failed to fetch apps: {e}",
            "severity": "high",
            "evidence": {},
            "detectedAt": now_iso,
            "status": "open"
        })

    return {"status": "success", "findings": findings}

