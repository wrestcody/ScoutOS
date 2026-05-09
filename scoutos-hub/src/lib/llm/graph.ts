import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { localLLM, SENTINEL_SYSTEM_PROMPT } from "./config";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { queryDeepRecall } from "./rag";

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

  const response = await localLLM.invoke([
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
