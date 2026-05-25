# Contributing to SCN Scout

Thank you for your interest in contributing to SCN Scout! As a project focused on government compliance automation, we maintain high standards for security, type safety, and architectural integrity.

## 🚀 Getting Involved

There are many ways to contribute:
- **Reporting Bugs:** Use GitHub Issues to report bugs.
- **Feature Requests:** Suggest new features or improvements.
- **Code Contributions:** Submit pull requests for bug fixes or features.
- **Documentation:** Improve this README, API docs, or add tutorials.

## 🛠 Development Workflow

### 1. Prerequisites
- Node.js (v18+)
- npm
- Docker (Optional, for running local LLMs like Ollama)

### 2. Setup
```bash
git clone https://github.com/your-org/scn-scout.git
cd scn-scout
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in the required values:
- `GEMINI_API_KEY`: Required for AI features.
- `LOCAL_LLM_URL`: Optional (for Ollama).
- `VITE_DEFAULT_AI_PROVIDER`: Choose your primary engine (`gemini`, `bedrock`, `local`).

### 4. Branching Strategy
- `main`: Production-ready code.
- `develop`: Ongoing development.
- Feature branches: `feat/your-feature` or `fix/your-bug`.

## 🛡 Security First

Because SCN Scout handles compliance data:
- **No Hardcoded Secrets:** Never commit API keys or passwords.
- **Type Safety:** All new code must be fully typed with TypeScript.
- **Security Rules:** If you modify the Firestore schema, you must update `firestore.rules`.

## 📝 Pull Request Checklist
- [ ] Code is linted (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] New features are documented in `README.md`
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)

## ⚖️ License
By contributing to SCN Scout, you agree that your contributions will be licensed under the MIT License.
