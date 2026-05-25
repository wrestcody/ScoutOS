import React, { useState } from 'react';
import { Shield, Play, Loader2, CheckCircle, AlertTriangle, ExternalLink, Cpu, Info } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

interface ExternalValidationProps {
  content: string;
}

export default function ExternalValidation({ content }: ExternalValidationProps) {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    tool: string;
    report: string;
    simulated: boolean;
    setupInstructions?: string;
  } | null>(null);
  const [selectedTool, setSelectedTool] = useState<'lula' | 'oscal-cli'>('lula');

  const runValidation = async () => {
    setValidating(true);
    setResult(null);
    try {
      const response = await axios.post('/api/validate/external', {
        tool: selectedTool,
        content,
        type: 'scr-package'
      });
      setResult(response.data);
    } catch (error: any) {
      console.error('Validation failed:', error);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 border border-blue-200">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight">External OSCAL Validator</h3>
            <p className="text-xs text-gray-500 font-mono">Verify posture integrity using industry tools.</p>
          </div>
        </div>
        <div className="flex bg-gray-100 border border-gray-900 overflow-hidden">
          <button
            onClick={() => setSelectedTool('lula')}
            className={`px-3 py-1 text-[10px] font-bold uppercase ${selectedTool === 'lula' ? 'bg-gray-900 text-white' : 'hover:bg-gray-200'}`}
          >
            Lula (Policy)
          </button>
          <button
            onClick={() => setSelectedTool('oscal-cli')}
            className={`px-3 py-1 text-[10px] font-bold uppercase ${selectedTool === 'oscal-cli' ? 'bg-gray-900 text-white' : 'hover:bg-gray-200'}`}
          >
            NIST CLI (Schema)
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-dashed border-gray-300 p-4 rounded-sm">
        <div className="flex items-start gap-3">
          <Cpu className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-mono text-gray-600 mb-2">
              This tool will run {selectedTool.toUpperCase()} validation against the current SCN package.
              Lula focuses on OPA policy enforcement, while the NIST CLI ensures strict OSCAL schema compliance.
            </p>
            <button
              onClick={runValidation}
              disabled={validating}
              className="group relative flex items-center gap-2 bg-gray-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all active:translate-x-0 active:translate-y-0 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gray-900 transform translate-x-[4px] translate-y-[4px] -z-10 group-hover:translate-x-[6px] group-hover:translate-y-[6px] transition-transform opacity-20"></div>
              {validating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {validating ? 'Executing Pipeline...' : `Run ${selectedTool.toUpperCase()} Check`}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`border border-gray-900 p-4 ${result.status === 'success' || result.status === 'simulated' ? 'bg-green-50' : 'bg-red-50'}`}
          >
            <div className="flex items-center gap-2 mb-3">
              {(result.status === 'success' || result.status === 'simulated') ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className="text-xs font-bold uppercase tracking-widest">
                Validation Result: {result.status}
              </span>
              {result.simulated && (
                <span className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-yellow-100 border border-yellow-200 text-[9px] font-bold text-yellow-700 uppercase">
                  Simulated
                </span>
              )}
            </div>
            
            <pre className="text-[10px] font-mono whitespace-pre-wrap bg-white/50 p-3 border border-gray-200 overflow-x-auto">
              {result.report}
            </pre>

            {result.simulated && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 italic">
                  <ExternalLink className="w-3 h-3" />
                  To run real toolchain locally: `npm run cli -- validate-external -t {result.tool}`
                </div>
                {result.setupInstructions && (
                  <div className="p-2 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-800 flex gap-2 items-start">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{result.setupInstructions}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
