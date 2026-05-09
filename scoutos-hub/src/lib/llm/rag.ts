import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OllamaEmbeddings } from "@langchain/ollama";
import fs from "fs";
import path from "path";
import { glob } from "glob";

// Constants
const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || path.join(process.cwd(), "mock_obsidian");
const VECTOR_STORE_PATH = path.join(process.cwd(), ".vector_cache");

const embeddings = new OllamaEmbeddings({
  model: "llama3.1",
  baseUrl: "http://localhost:11434",
});

/**
 * Utility to scrub text through the Armor Layer before embedding/returning
 */
function scrubText(text: string): string {
    let scrubbedText = text;
    const ARMOR_REGEXES = [
        /akia[0-9a-z]{16}/ig, // AWS Access Key
        /gh[pousr]_[a-zA-Z0-9]{36}/ig, // GitHub Token
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email
    ];

    for (const regex of ARMOR_REGEXES) {
        scrubbedText = scrubbedText.replace(regex, '[REDACTED_BY_ARMOR]');
    }
    return scrubbedText;
}

/**
 * Indexes Markdown files from specific Obsidian folders.
 */
export async function indexObsidianVault() {
  console.log(`[INFO] Starting Deep Recall indexing from ${OBSIDIAN_VAULT_PATH}...`);

  if (!fs.existsSync(OBSIDIAN_VAULT_PATH)) {
      console.warn(`[WARNING] Vault path ${OBSIDIAN_VAULT_PATH} does not exist. Creating mock directory.`);
      fs.mkdirSync(path.join(OBSIDIAN_VAULT_PATH, "00_Inbox", "Argus_Sync"), { recursive: true });
      fs.mkdirSync(path.join(OBSIDIAN_VAULT_PATH, "Projects"), { recursive: true });

      // Write a mock file
      fs.writeFileSync(
          path.join(OBSIDIAN_VAULT_PATH, "Projects", "Q3_Architecture_Review.md"),
          "# Q3 Architecture Review\n\nDecision: Gate deployment on OPA agent logs to ensure SOC2 compliance. AWS Key akia1234567890abcdef was rotated."
      );
  }

  // Find MD files in target dirs
  const targetDirs = ["00_Inbox/Argus_Sync/**/*.md", "Projects/**/*.md"];
  let allFiles: string[] = [];

  for (const dirPattern of targetDirs) {
      const files = glob.sync(path.join(OBSIDIAN_VAULT_PATH, dirPattern));
      allFiles = allFiles.concat(files);
  }

  if (allFiles.length === 0) {
      console.log("[INFO] No markdown files found to index.");
      return;
  }

  const docs = [];
  for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      // CRITICAL: Scrub before embedding so the vector store itself doesn't hold PII
      const scrubbedContent = scrubText(content);

      docs.push({
          pageContent: scrubbedContent,
          metadata: { source: file }
      });
  }

  console.log(`[INFO] Creating embeddings for ${docs.length} documents...`);
  try {
      const vectorStore = await FaissStore.fromDocuments(docs, embeddings);
      await vectorStore.save(VECTOR_STORE_PATH);
      console.log("[INFO] Deep Recall indexing complete. Saved to", VECTOR_STORE_PATH);
  } catch (e) {
      console.error("[ERROR] Failed to index documents:", e);
  }
}

/**
 * Queries the local index for context.
 */
export async function queryDeepRecall(query: string, topK: number = 2): Promise<string> {
    if (!fs.existsSync(VECTOR_STORE_PATH)) {
        console.warn("[WARNING] Vector store not found. Have you run the indexer?");
        return "";
    }

    try {
        const vectorStore = await FaissStore.load(VECTOR_STORE_PATH, embeddings);
        const results = await vectorStore.similaritySearch(query, topK);

        if (results.length === 0) return "";

        const contextParts = results.map(r => `Source: ${path.basename(r.metadata.source)}\n${r.pageContent}`);

        // Final scrub just in case (defense in depth)
        return scrubText(contextParts.join("\n\n---\n\n"));
    } catch (e) {
        console.error("[ERROR] Failed to query Deep Recall:", e);
        return "";
    }
}

/**
 * Retrieves recently created Markdown files for SITREP aggregation.
 */
export async function getRecentVaultNotes(days: number = 7): Promise<string> {
    const targetDirs = ["00_Inbox/Argus_Sync/**/*.md", "Projects/**/*.md"];
    let allFiles: string[] = [];

    for (const dirPattern of targetDirs) {
        const files = glob.sync(path.join(OBSIDIAN_VAULT_PATH, dirPattern));
        allFiles = allFiles.concat(files);
    }

    const recentDocs = [];
    const now = Date.now();
    const cutoff = now - (days * 24 * 60 * 60 * 1000);

    for (const file of allFiles) {
        const stats = fs.statSync(file);
        if (stats.mtimeMs >= cutoff) {
            const content = fs.readFileSync(file, 'utf-8');
            recentDocs.push(`Source: ${path.basename(file)}\n${content}`);
        }
    }

    if (recentDocs.length === 0) return "No recent notes found.";

    return scrubText(recentDocs.join("\n\n---\n\n"));
}
