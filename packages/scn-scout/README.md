# SCN Scout: FedRAMP 20x Engine

**The Enterprise Engine for Automated Compliance and Significant Change Notifications.**

SCN Scout is a mission-critical platform designed to transition FedRAMP authorized systems from manual, narrative-based change management to **extreme automation** using the FedRAMP 20x standards (RFC-0007). It eliminates the traditional "wait-for-approval" cycle by enforcing deterministic proof-of-security post-deployment.

---

## 🚀 Key Capabilities

### 1. FedRAMP 20x Classification Engine
Automated categorization of system changes into the three 20x Tiers:
- **Adaptive:** Iterative improvements (14-day post-deployment SCN submission).
- **Transformative:** Major shifts (1-day post-deployment notification).
- **Routine:** Maintenance/Patching (Silent logging in ConMon audit trails).

### 2. Validation & Telemetry Hooks (KSI Plugin)
Instead of screenshots, SCN Scout uses **Continuous Verification Hooks**.
- Link your **AWS Lambdas**, **GitHub Actions**, or **API Security Checks** directly to change notifications.
- Automatically gather cryptographic hashes and pass/fail evidence for **63 Key Security Indicators (KSIs)**.

### 3. OSCAL SchemaGate Verification
Every SCN is validated against the latest OSCAL (Open Security Controls Assessment Language) metaschema before submission, ensuring 100% machine-readability and government inbox compatibility.

### 4. Multi-Modal AI Specialist
Consult the compliance AI via:
- **Google Gemini 1.5 Pro** (Default)
- **AWS Bedrock (Claude 3)**
- **Local LLMs (via Ollama)** for air-gapped or sensitive data handling.

### 5. Vault Integration Suite (Secrets Management)
Securely manage and verify the status of cryptographic keys and service credentials across:
- **AWS Secrets Manager** (ARN Verification)
- **HashiCorp Vault**
- **Azure Key Vault**
Includes logic for enforcing **IA-5(7)** rotation boundaries (90-day cycle).

### 6. Integrated Project Management
- **Jira Support:** Link SCNs directly to primary engineering tickets.
- **Markdown Reference Links:** Support for rich-text references to external documentation and evidence.

---

## 🛠 Tech Stack & Architecture

- **Frontend:** React 18, Tailwind CSS, Lucide Icons, Motion (Animations).
- **Backend:** Node.js / Express (Full-stack setup).
- **Database:** Firebase Firestore (Real-time sync).
- **Secrets:** Vault Audit Proxy (Deterministic verification).
- **Security:** Firebase Auth & Fine-grained Security Rules.
- **Protocol:** Model Context Protocol (MCP) for LLM context injection.
- **Docs:** OpenAPI 3.0 (Swagger).

---

## 💻 CLI Tooling

SCN Scout includes a powerful CLI for pipeline integration and terminal-first compliance management.

```bash
# Get help and see all commands
npm run cli -- --help

# Fetch current compliance context via MCP (Model Context Protocol)
npm run cli -- mcp

# Request AI guidance for a specific change (Gemini, Bedrock, or Local)
npm run cli -- ai-guidance "Moving from S3 to encrypted RDS" --provider local

# Suggest a FedRAMP 20x Category (Adaptive, Transformative, Routine)
npm run cli -- categorize "Updating kernel version on all worker nodes"

# Translate HLA text to structured JSON for OSCAL mapping
npm run cli -- hla "Global VPC with Ingress at port 443, traffic proxied to EKS"

# Trigger a Telemetry Sync for evidence gathering
npm run cli -- sync "https://github.com/org/repo/actions/runs/123"

# Run External Tool Validation (Lula, NIST CLI)
npm run cli -- validate-external --tool lula

# Validate a local SCN file against SchemaGate
npm run cli -- validate ./my-scn.yaml
```

---

## 🛡️ External Tool Integration (`validate-external`)

The `validate-external` command allows SCN Scout to leverage industry-standard compliance-as-code validation tools directly from your terminal or CI/CD pipeline.

### Purpose
This command bridges the gap between your local infrastructure (where your OSCAL or Lula files reside) and the SCN Scout validation engine. It enables automated verification of system posture or OSCAL schemas using specialized external toolchains.

### Usage & Arguments
```bash
npm run cli -- validate-external [OPTIONS]
```

| Argument | Description | Default |
| :--- | :--- | :--- |
| `-t, --tool <tool>` | The external validation engine to use. Supported: `lula`, `oscal-cli`. | `lula` |
| `-f, --file <path>` | Path to the local OSCAL or Lula validation file to be uploaded for analysis. | N/A |

### Supported Tools
- **[Lula](https://github.com/defenseunicorns/lula):** An OSCAL-native validation engine for checking infrastructure-as-code and live cloud resources against security controls.
- **oscal-cli (NIST):** The reference implementation for validating OSCAL XML/JSON/YAML files against official metaschemas and performing semantic checks.

---

## 📖 API Documentation (OpenAPI / Swagger)

SCN Scout provides a comprehensive REST API for integration with CI/CD pipelines, security tools, and custom dashboards.

- **Interactive Documentation:** When the application is running, access the [Swagger UI at `/api/docs`](http://localhost:3000/api/docs). (In production, use your deployed base URL + `/api/docs`).
- **Static Specification:** The OpenAPI 3.0 schema is available at [swagger.json](./swagger.json) for use with external tools like Postman or Insomnia.

The Swagger UI includes detailed specifications for all endpoints, including:
- `/api/ai/local`: Local LLM (Ollama) orchestration.
- `/api/validate/external`: OSCAL validation proxy (Lula/NIST).
- `/api/mcp`: Model Context Protocol integration.
- `/api/telemetry/sync`: Automated evidence gathering.
- `/api/vault/verify`: Secrets manager audit proxy.

---

## 🔌 API & Model Context Protocol (MCP)

### MCP for AI Agents
Link SCN Scout to your own AI Developer (like Gemini or Claude) to give it full context of your authorized architecture and pending changes.

---

## 🏁 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Environment Setup:**
   Create a `.env` file with:
   - `GEMINI_API_KEY`: For the primary specialist.
   - `FIREBASE_CONFIG`: For data persistence.
3. **Start Development:**
   ```bash
   npm run dev
   ```
4. **Local LLM Opt-in:**
   Configure `LOCAL_LLM_URL` in your `.env` file (defaults to `http://localhost:11434`).
   Ensure [Ollama](https://ollama.com) is running and accessible at that endpoint to use the `local` AI provider option.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⚖️ Compliance Invariant
SCN Scout follows the **Post-Deployment Notification** model. It does not stop you from changing the system; it ensures you can **prove** the system remains secure after the change.
