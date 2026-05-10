# ScoutOS: Autonomous GRC & Tactical Operations

ScoutOS has pivoted from a python-based evidence collection framework into a highly-specialized, local-first **"Chief of Staff" AI for Cybersecurity Leaders**.

It features a high-density "Glass-Tactical" HUD, runs autonomous LangGraph agentic loops, securely polls enterprise APIs, and uses local vector indexing (Deep Recall RAG) against an Obsidian PARA vault to provide context-aware security intelligence.

## 🧠 Core Modules

ScoutOS is divided into four distinct modules, visible in the main Mission Control dashboard and as dedicated application routes:

*   **Vanguard (Panel A):** The perimeter intelligence intake. Polls Genesys Cloud and Microsoft Graph (Outlook) to stream and classify actionable operational signals.
*   **Argus (Panel B):** Intelligence extraction and mapping. Analyzes architecture notes to extract Technical Decisions and Security Risks. Features Wiz-style "Toxic Combination" cards, mapping vulnerabilities to specific frameworks (SOC 2, NIST) and providing actionable Cloud Evidence Guidance.
*   **Sentinel (Panel C):** Operations and security oversight. Monitors stale Jira tickets and triggers the **Deep Recall** engine to search local historical notes for missing context before proposing action.
*   **Terminal (Panel D):** The Nerve Feed. A high-density command-line interface streaming system logs, Armor Redaction events, and accepting manual slash commands (e.g., `/sitrep`).

## 🛡️ Security First: The Armor Layer & Air-Gap Protocol

ScoutOS is designed for zero-leakage security when handling sensitive corporate intelligence.

1.  **The Armor Layer:** Every piece of data entering the system (via POST requests or API polling) must pass through a strict regex scrubber in the Hono backend. PII (SSNs, Emails) and Secrets (AWS Keys, GitHub Tokens) are stripped and replaced with `[REDACTED_BY_ARMOR]` *before* they ever touch an LLM or the UI.
2.  **Strict Air-Gap Toggle (`VITE_AI_MODE`):**
    *   `local`: Enforces a strict air-gap. External APIs (Genesys, MS Graph) are blocked. The Atlassian MCP is disabled. All intelligence routing is sent to a local `Ollama` instance.
    *   `cloud`: Allows OAuth token exchange for live API polling, permits Confluence scaffolding via MCP, and routes advanced reasoning tasks to OpenAI (`gpt-4-turbo`).

## ⚙️ Architecture

*   **Frontend:** React 19 + Vite. Styled with Tailwind CSS and `shadcn/ui` in a forced "Glass-Tactical" dark mode (Deep Dark `#0A0A0B`, backdrop blurs, mono/serif typographic hierarchy).
*   **Backend:** Node + Hono. Serves as the API gateway, runs the Armor Layer, and manages the LangChain/LangGraph agent loops.
*   **Memory:** `faiss-node` vector store indexing local markdown files, powered by `OllamaEmbeddings`.
*   **Integrations:** `@modelcontextprotocol/sdk` (MCP) connecting to `@modelcontextprotocol/server-atlassian` for native Confluence page scaffolding.

## 🚀 Quick Start Guide

### Prerequisites
1.  **Node.js** (v20+)
2.  **Ollama**: Must be running locally (`http://localhost:11434`) with the `llama3.1` model installed (`ollama run llama3.1`).
3.  **SOPS**: Installed for JIT environment variable decryption (if using `.env.enc`).
4.  **Atlassian MCP**: To scaffold architectures, ensure `npx` is available to spawn the server.

### Installation

1. Navigate to the Hub directory:
   ```bash
   cd scoutos-hub
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Environment:
   * Copy the template: `cp .env.template .env`
   * Fill out the necessary API keys and paths (see the `.env.template` file for instructions).
4. Boot the System:
   ```bash
   ./boot.sh
   ```
   *The `boot.sh` script will attempt to decrypt `.env.enc` via SOPS. If SOPS is unavailable, it gracefully falls back to your local `.env` file and starts the Vite/Hono dev server on port `3000`.*

## 📂 Intelligence Loop (Closing the Circuit)

ScoutOS is not just a dashboard; it is an active participant in your workflow.

*   **Commit to Vault:** From the Argus panel, clicking "Commit to Vault" takes extracted intelligence (with its Crosswalks and Guidance) and writes it directly to your local Obsidian vault (`00_Inbox/Argus_Sync/`) with perfectly formatted YAML frontmatter for future indexing.
*   **Friday SITREP:** Typing `/sitrep` in the Terminal triggers a LangGraph workflow that reads all notes generated in the last 7 days, drafts an Executive Summary, saves it to the Vault, and streams a 2-sentence BLUF back to the HUD.

---
*Note: The legacy Python/Terraform evidence collection scripts reside in the root directory and will eventually be refactored as independent ScoutOS MCP Skills.*