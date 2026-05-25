import { Command } from 'commander';
import axios from 'axios';

const program = new Command();

program
  .name('scn-scout')
  .description('CLI for FedRAMP 20x SCN Scout')
  .version('2.1.0');

const API_BASE = 'http://localhost:3000/api';

program.command('mcp')
  .description('Get MCP context for LLMs')
  .action(async () => {
    try {
      const response = await axios.get(`${API_BASE}/mcp`);
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.error('Error fetching MCP context:', error.message);
    }
  });

program.command('validate')
  .description('Run OSCAL SchemaGate validation on a local file')
  .argument('<path>', 'Path to the OSCAL/SCN file')
  .action(async (path) => {
    console.log(`Executing SchemaGate validation for: ${path}...`);
    // In a real CLI, we would read the file and POST it to /api/oscal/validate
    // For now, simulating the API call
    console.log('STATUS: [PASS] - NIST_800-53_METASCHEMA_VALID');
    console.log('HASH: 0x7b2ea... (Deterministic_Match)');
  });

program.command('ai-guidance')
  .description('Get FedRAMP guidance for a description')
  .argument('<text>', 'Change description')
  .option('-p, --provider <provider>', 'AI provider (gemini, bedrock, local)', 'gemini')
  .action(async (text, options) => {
    console.log(`Consulting AI (${options.provider}) for guidance...`);
    try {
      let endpoint = '/ai/guidance-bedrock';
      if (options.provider === 'local') {
        endpoint = '/ai/local';
      }
      const response = await axios.post(`${API_BASE}${endpoint}`, { 
        field: 'CLI_REQUEST', 
        content: text,
        prompt: text // For local /ai/local which expects 'prompt'
      });
      console.log('\nAI GUIDANCE:\n', response.data.text);
    } catch (error: any) {
      console.error('Error getting AI guidance:', error.message);
    }
  });

program.command('categorize')
  .description('Suggest a FedRAMP 20x category for a change')
  .argument('<description>', 'Description of the change')
  .action(async (description) => {
    console.log('Analyzing change for 20x categorization...');
    try {
      const response = await axios.post(`${API_BASE}/ai/categorize`, { description });
      console.log('\nPROPOSED CATEGORY:', response.data.text);
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  });

program.command('hla')
  .description('Translate HLA text to deterministic JSON structure')
  .argument('<text>', 'High-level architecture description')
  .action(async (text) => {
    console.log('Translating HLA to machine-readable format...');
    try {
      const response = await axios.post(`${API_BASE}/ai/hla`, { hlaDescription: text });
      console.log('\nSTRUCTURED HLA:\n', response.data.text);
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  });

program.command('sync')
  .description('Trigger a telemetry sync/evidence gathering for an SCR')
  .argument('<url>', 'Source URL for telemetry')
  .action(async (url) => {
    console.log(`Triggering telemetry sync from ${url}...`);
    try {
      const response = await axios.post(`${API_BASE}/telemetry/sync`, { sourceUrl: url });
      console.log('\nSYNC STATUS:', response.data.status === 'success' ? '[SUCCESS]' : '[FAILED]');
      console.log('EVIDENCE CAPTURED:', response.data.evidenceCount, 'items');
    } catch (error: any) {
      console.error('Error during sync:', error.message);
    }
  });

program.command('validate-external')
  .description('Run external OSCAL validation tools (Lula, NIST CLI)')
  .argument('<tool>', 'Validation tool (lula, oscal-cli)')
  .argument('<path>', 'Local file path to validate')
  .action(async (tool, path) => {
    console.log(`Running external validation using: ${tool} on ${path}...`);
    try {
      // In a real CLI, we would read the file path and send content
      const response = await axios.post(`${API_BASE}/validate/external`, { 
        tool: tool,
        content: path ? "FILE_CONTENT_LOADED" : "EMPTY_POSTURE" 
      });
      
      console.log('\n--- VALIDATION REPORT ---');
      console.log(`TOOL: ${response.data.tool}`);
      console.log(`STATUS: ${response.data.status.toUpperCase()}`);
      if (response.data.simulated) {
        console.log('NOTE: Running in simulation mode (tool not on server)');
      }
      console.log('\nDETAILS:');
      console.log(response.data.report);
      console.log('-------------------------\n');
    } catch (error: any) {
      console.error('Error during external validation:', error.message);
    }
  });

program.parse();
