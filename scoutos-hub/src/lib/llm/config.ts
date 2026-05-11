import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";

// Director-Level Tone Prompts
export const VANGUARD_SYSTEM_PROMPT = `You are VanguardNode, the perimeter intelligence intake for ScoutOS.
Your tone is STRATEGIC, DIRECT, and AUTHORITATIVE. No fluff. Use military brevity. Give the Bottom Line Up Front (BLUF).
Focus on technical evidence, risk impact, and SOC2/FIPS compliance.
Analyze the incoming signal and classify its priority.`;

export const SENTINEL_SYSTEM_PROMPT = `You are SentinelNode, the operations and security oversight engine for ScoutOS.
Your tone is STRATEGIC, DIRECT, and AUTHORITATIVE. No fluff. Use military brevity. Give the Bottom Line Up Front (BLUF).
Focus on technical evidence, risk impact, and SOC2/FIPS compliance.
Analyze operational backlogs (like stale Jira tickets) and synthesize actions based on provided context.`;

export const SITREP_SYSTEM_PROMPT = `You are SitrepNode, the executive intelligence aggregator for ScoutOS.
Your persona is "Direct Executive". Your tone is STRATEGIC, DIRECT, and AUTHORITATIVE. No fluff. Use military brevity. Give the Bottom Line Up Front (BLUF).
Generate a weekly Situation Report (SITREP) based on the provided extractions (Decisions, Risks, Ops). Format the output as clean Markdown suitable for executive review.`;

export const localLLM = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "llama3.1",
  temperature: 0.1, // Low temp for more deterministic, authoritative outputs
});

export const cloudLLM = new ChatOpenAI({
  modelName: "gpt-4-turbo",
  temperature: 0.1,
  openAIApiKey: process.env.OPENAI_API_KEY || "mock-key", // The backend will inject the real key or fail gracefully if missing
});

import { execSync } from 'child_process';

export const getLLM = (promptContext?: string) => {
   // Strict Air-Gap Check: If local, NEVER use cloud, regardless of prompt complexity
   if (process.env.VITE_AI_MODE !== 'cloud') {
       console.log("[LLM ROUTER] Air-Gap active. Forcing local LLM.");
       return localLLM;
   }

   // If cloud mode is allowed, and we have context, use NadirClaw for Cost-Aware Routing
   if (promptContext) {
       try {
           console.log("[LLM ROUTER] Running NadirClaw Cost-Aware Classification...");
           // We use NadirClaw CLI to classify the prompt complexity locally
           // Escaping the prompt string to prevent bash injection
           const safePrompt = promptContext.replace(/"/g, '\\"');
           const output = execSync(`nadirclaw classify --format json "${safePrompt}"`).toString();
           const classification = JSON.parse(output.trim());

           if (classification.tier === 'simple') {
               console.log("[LLM ROUTER] Cost-Aware Decision: Task is SIMPLE. Routing to local LLM to save costs.");
               return localLLM;
           } else {
               console.log("[LLM ROUTER] Cost-Aware Decision: Task is COMPLEX. Escalating to GPT-4-Turbo.");
               return cloudLLM;
           }
       } catch (e) {
           console.error("[LLM ROUTER] NadirClaw routing failed, defaulting to Cloud LLM:", e);
           return cloudLLM;
       }
   }

   // Default to cloud if in cloud mode and no prompt context was provided for routing
   return cloudLLM;
};
