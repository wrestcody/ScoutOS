import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { getLLM, SENTINEL_SYSTEM_PROMPT, SITREP_SYSTEM_PROMPT } from "./config";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { queryDeepRecall, getRecentVaultNotes } from "./rag";

// Define the state interface
interface AgentState {
  ticketId: string;
  ticketDescription: string;
  timeSinceUpdate: string;
  retrievedContext?: string;
  analysisOutput?: string;
}

// Deep Recall Node
const recallNode = async (state: AgentState) => {
    console.log(`[INFO] Triggering Deep Recall for ticket ${state.ticketId}...`);
    // Create a search query based on the ticket description
    const context = await queryDeepRecall(state.ticketDescription);
    return { retrievedContext: context };
};

// Sentinel Node Function
const sentinelNode = async (state: AgentState) => {
  const contextBlock = state.retrievedContext
    ? `\nCONTEXTUAL REFERENCE FROM DEEP RECALL:\n${state.retrievedContext}\n`
    : "";

  const prompt = `Analyze the following stale operational ticket.
Ticket: ${state.ticketId}
Description: ${state.ticketDescription}
Stale Time: ${state.timeSinceUpdate}
${contextBlock}

Provide a direct assessment and a proposed nudge for the assigned engineer. Ensure the proposed nudge incorporates the Contextual Reference if one is provided.`;

  const llm = getLLM();
  const response = await llm.invoke([
    new SystemMessage(SENTINEL_SYSTEM_PROMPT),
    new HumanMessage(prompt)
  ]);

  return { analysisOutput: response.content as string };
};

// Define the graph
const builder = new StateGraph<AgentState>({
  channels: {
    ticketId: null,
    ticketDescription: null,
    timeSinceUpdate: null,
    retrievedContext: null,
    analysisOutput: null,
  }
})
  .addNode("recall", recallNode)
  .addNode("sentinel", sentinelNode)
  .addEdge(START, "recall")
  .addEdge("recall", "sentinel")
  .addEdge("sentinel", END);

export const sentinelGraph = builder.compile({ checkpointer: new MemorySaver() });

// --- SITREP Engine Graph ---
interface SitrepState {
  sitrepContent?: string;
  blufSummary?: string;
}

const sitrepNode = async (_state: SitrepState) => {
    console.log(`[INFO] Triggering SITREP Generation...`);

    // 1. Gather recent notes
    const recentContext = await getRecentVaultNotes(7);

    // 2. Generate full SITREP
    const prompt = `Based on the following extractions from the last 7 days, generate a comprehensive executive Situation Report (SITREP) in Markdown format.
Include sections for Technical Decisions, Mitigated Risks, and Stale Ops.

Context:
${recentContext}`;

    const llm = getLLM();
    const response = await llm.invoke([
        new SystemMessage(SITREP_SYSTEM_PROMPT),
        new HumanMessage(prompt)
    ]);

    const sitrepContent = response.content as string;

    // 3. Generate BLUF summary for Terminal
    const blufPrompt = `Generate a strict 2-sentence BLUF (Bottom Line Up Front) summary of the following SITREP:\n\n${sitrepContent}`;
    const blufResponse = await llm.invoke([
         new SystemMessage(`You are a summarization node. Tone: Military brevity. Max length: 2 sentences.`),
         new HumanMessage(blufPrompt)
    ]);

    return {
        sitrepContent,
        blufSummary: blufResponse.content as string
    };
};

const sitrepBuilder = new StateGraph<SitrepState>({
    channels: {
        sitrepContent: null,
        blufSummary: null,
    }
})
    .addNode("sitrep", sitrepNode)
    .addEdge(START, "sitrep")
    .addEdge("sitrep", END);

export const sitrepGraph = sitrepBuilder.compile({ checkpointer: new MemorySaver() });
