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

export const getLLM = () => {
   if (process.env.VITE_AI_MODE === 'cloud') {
       return cloudLLM;
   }
   return localLLM;
};
