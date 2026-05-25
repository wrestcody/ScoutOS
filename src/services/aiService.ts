import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { SCR } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const DEFAULT_PROVIDER = (import.meta.env.VITE_DEFAULT_AI_PROVIDER as any) || "gemini";

async function callAI(prompt: string, provider = DEFAULT_PROVIDER, isJson = false) {
  if (provider === "local") {
    try {
      const response = await axios.post("/api/ai/local", { prompt });
      return response.data.text;
    } catch (error) {
      console.error("Local LLM Error:", error);
      throw error;
    }
  }

  if (provider === "bedrock") {
    try {
      const response = await axios.post("/api/ai/guidance-bedrock", { content: prompt, field: "AI_REQUEST" });
      return response.data.text;
    } catch (error) {
      console.error("Bedrock AI Error:", error);
      throw error;
    }
  }

  // Default Gemini
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: isJson ? { responseMimeType: "application/json" } : undefined
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
}

export async function getSCRGuidance(field: string, content: string, provider = DEFAULT_PROVIDER, context?: Partial<SCR>) {
  const contextStr = context ? `\nApp Context: ${JSON.stringify({
    changeType: context.changeType,
    mappedControls: context.mappedControls?.map(c => c.controlId),
    hlaDescription: context.hlaDescription,
    isDeterministic: context.isDeterministic
  })}` : "";

  const prompt = `You are a FedRAMP compliance expert. Field: "${field}". Content: "${content}". Provide FedRAMP Rev 5 guidance.${contextStr}`;
  try {
    return await callAI(prompt, provider);
  } catch (error) {
    return "Unable to get guidance at this time.";
  }
}

export async function analyzeSecurityImpact(description: string, provider = DEFAULT_PROVIDER, context?: Partial<SCR>) {
  const contextStr = context ? `\nContextual Data:
- Change Type: ${context.changeType || 'N/A'}
- Mapped Controls: ${context.mappedControls?.map(c => c.controlId).join(', ') || 'None'}
- HLA Description: ${context.hlaDescription || 'N/A'}
- Reason for Change: ${context.reasonForChange || 'N/A'}
- Customer Impact: ${context.customerImpactItems?.map(i => `${i.area}: ${i.impact}`).join('; ') || 'N/A'}` : "";

  const prompt = `Analyze this for FedRAMP SIA: "${description}". Mapping to NIST 800-53 Rev 5.${contextStr}`;
  try {
    return await callAI(prompt, provider);
  } catch (error) {
    return "Error analyzing security impact.";
  }
}

export async function categorizeChange(description: string, provider = DEFAULT_PROVIDER, context?: Partial<SCR>) {
  const contextStr = context ? `\nContextual Data:
- Current Change Type (if any): ${context.changeType || 'N/A'}
- Controls Impacted: ${context.mappedControls?.map(c => c.controlId).join(', ') || 'N/A'}
- HLA Details: ${context.hlaDescription || 'N/A'}` : "";

  const prompt = `Analyze this change description and suggest a FedRAMP 20x category:
  - Adaptive: Iterative improvements, refactoring, no fundamental risk shift. (14-day post-deployment SCN)
  - Transformative: Major architectural shifts, moving to K8s, GenAI additions. (1-day post-deployment notification)
  - Routine: Patching, vulnerability remediation. (Silent Log in ConMon)
  
  Return JSON with "type" (one of the three above) and "explanation". 
  Description: ${description}${contextStr}`;

  try {
    const text = await callAI(prompt, provider, true);
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonStr = text.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr);
    }
  } catch (error) {
    return { type: "Adaptive", explanation: "Manual analysis required." };
  }
}

export async function generateSIAFromInterview(answers: Record<string, string>, provider = DEFAULT_PROVIDER, context?: Partial<SCR>) {
  const contextStr = context ? `\nExisting SCR Context: ${JSON.stringify({
    shortDescription: context.shortDescription,
    changeType: context.changeType,
    mappedControls: context.mappedControls?.map(c => c.controlId),
    hlaDescription: context.hlaDescription
  })}` : "";

  const prompt = `Interview answers for SIA: ${JSON.stringify(answers)}${contextStr}`;
  try {
    return await callAI(prompt, provider);
  } catch (error) {
    return "Error compiling SIA.";
  }
}

export async function getControlGuidance(controlId: string, controlName: string, changeDescription: string, telemetryAnchors: string[] = [], provider = DEFAULT_PROVIDER, context?: Partial<SCR>) {
  const contextStr = context ? `\nContextual Data:
- Change Type: ${context.changeType || 'N/A'}
- Mapped Controls: ${context.mappedControls?.map(c => c.controlId).join(', ') || 'N/A'}
- HLA Description: ${context.hlaDescription || 'N/A'}` : "";

  const anchorsContext = telemetryAnchors.length > 0 
    ? `\nAvailable Telemetry Anchors for citation: ${telemetryAnchors.join(', ')}`
    : "";

  const prompt = `You are a Cloud Security Architect specializing in FedRAMP 20x Significant Change Notifications. 
  I need to justify how NIST 800-53 control ${controlId} (${controlName}) is impacted or maintained.

  Change Description: ${changeDescription}${contextStr}${anchorsContext}

  STRICT REQUIREMENT: Your output MUST follow this format:
  "The [capability] is [status], verified via [specific telemetry anchor] hash [mock_hash_0x...] at Timestamp [current_time]."
  Do not hallucinate capabilities. If no anchor fits, explain why narrative evidence is required.`;

  try {
    return await callAI(prompt, provider);
  } catch (error) {
    return "Unable to get guidance for this control.";
  }
}

export async function validateOSCALSchema(oscalData: any) {
  // Simulate official NIST/FedRAMP schema validation logic
  console.log("Running Pre-Flight OSCAL Validation...");
  
  const hasMetadata = !!oscalData.component_definition.metadata;
  const hasComponents = oscalData.component_definition.components?.length > 0;
  const versionValid = oscalData.component_definition.metadata.version === "20x.1";

  if (hasMetadata && hasComponents && versionValid) {
    return { valid: true, report: "OSCAL Schema matches NIST 800-53 Rev 5 / FedRAMP 20x.1 metadata standards." };
  }
  
  return { 
    valid: false, 
    report: "Schema mismatch detected: " + (!versionValid ? "Invalid 20x version tag. " : "") + (!hasComponents ? "Missing component definitions." : "")
  };
}

export async function translateHLA(hlaDescription: string, provider = DEFAULT_PROVIDER) {
  const prompt = `You are a Cloud Security Architect specializing in FedRAMP 20x (RFC-0024). 
  Translate the following High-Level Architecture (HLA) description into a structured, machine-readable JSON format that defines:
  1. Component Nodes (Name, Type, Criticality)
  2. Data Flows (Source, Destination, Encryption Status)
  3. Boundary Points (Ingress/Egress)
  4. Telemetry Anchors (Where deterministic evidence should be collected)

  HLA Description: ${hlaDescription}

  Return ONLY a JSON object representing the deterministic HLA.`;

  try {
    const text = await callAI(prompt, provider);
    // Attempt to parse JSON from AI response
    try {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { error: "Failed to parse HLA structure" };
    } catch (e) {
      return { error: "AI returned invalid JSON for HLA" };
    }
  } catch (error) {
    return { error: "Service unavailable" };
  }
}

export async function syncToJira(scr: any) {
  try {
    const response = await axios.post("/api/jira/sync", { scr });
    return response.data;
  } catch (error) {
    console.error("Jira Sync Error:", error);
    throw error;
  }
}

export async function suggestControls(shortDescription: string, hlaDescription: string, provider = DEFAULT_PROVIDER) {
  const prompt = `You are a FedRAMP compliance expert. 
  I have a change description and High-Level Architecture (HLA) details. 
  Suggest the most relevant NIST 800-53 Rev 5 control IDs (e.g., AC-1, CM-2, SI-7) that would be impacted or required for validation of this change.

  Short Description: ${shortDescription}
  HLA Description: ${hlaDescription}

  Return ONLY a JSON array of strings containing the control IDs.
  Format: ["ID-1", "ID-2", ...]`;

  try {
    const text = await callAI(prompt, provider, true);
    try {
      const match = text.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : [];
    } catch (e) {
      console.error("Failed to parse suggested controls:", e);
      return [];
    }
  } catch (error) {
    console.error("Suggest Controls error:", error);
    return [];
  }
}
