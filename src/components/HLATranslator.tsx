import React, { useState } from 'react';
import { Network, Sparkles, Loader2, CheckCircle, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { translateHLA } from '../services/aiService';
import { HLAMetadata } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HLATranslatorProps {
  onTranslated: (description: string, data: HLAMetadata) => void;
  initialDescription?: string;
  initialData?: HLAMetadata;
  aiProvider: 'gemini' | 'bedrock' | 'local';
}

export default function HLATranslator({ onTranslated, initialDescription = '', initialData, aiProvider }: HLATranslatorProps) {
  const [description, setDescription] = useState(initialDescription);
  const [isTranslating, setIsTranslating] = useState(false);
  const [data, setData] = useState<HLAMetadata | null>(initialData || null);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!description.trim()) return;
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateHLA(description, aiProvider);
      if (result.error) {
        setError(result.error);
      } else {
        setData(result as HLAMetadata);
        onTranslated(description, result as HLAMetadata);
      }
    } catch (err) {
      setError("An unexpected error occurred during HLA translation.");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#141414] p-6 space-y-6 shadow-[8px_8px_0px_0px_rgba(30,30,30,0.05)]">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <Network className="w-5 h-5 text-indigo-600" />
        <div className="flex flex-col">
          <h3 className="text-sm font-bold font-sans uppercase tracking-tight">HLA_Deterministic_Translator</h3>
          <span className="text-[9px] font-mono text-gray-400 font-bold">CONVERT_NARRATIVE_ARCH_TO_MACHINE_EVIDENCE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Narrative_Architecture_Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., We are adding an AWS Lambda function that processes S3 events and writes to a DynamoDB table. All data in transit is TLS 1.2+."
              className="w-full h-48 p-3 border border-gray-200 focus:border-indigo-500 font-mono text-xs leading-relaxed transition-all outline-none bg-gray-50/30"
            />
          </div>
          <button 
            onClick={handleTranslate}
            disabled={isTranslating || !description.trim()}
            className="w-full bg-indigo-600 text-white py-3 font-mono font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-none translate-x-0 translate-y-0 active:translate-x-1 active:translate-y-1"
          >
            {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            GENERATE_DETERMINISTIC_MODEL
          </button>
        </div>

        {/* Output */}
        <div className="bg-slate-900 text-slate-300 p-4 font-mono text-[10px] border border-slate-800 relative overflow-hidden flex flex-col min-h-[200px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <span className="text-slate-500 font-bold uppercase">MODEL_OUTPUT [RFC-0024]</span>
            {data && <CheckCircle className="w-3 h-3 text-green-500" />}
          </div>

          <AnimatePresence mode="wait">
            {!data && !error && !isTranslating && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center flex-grow text-slate-600 gap-2 p-8 text-center"
              >
                <div className="w-12 h-12 border-2 border-slate-800 rounded-full flex items-center justify-center mb-2">
                  <ArrowRight className="w-6 h-6 opacity-20" />
                </div>
                WAITING_FOR_NARRATIVE_INPUT...
              </motion.div>
            )}

            {isTranslating && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center flex-grow gap-4"
              >
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-indigo-400">ANALYZING_TOPOLOGY...</span>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 border border-red-900/50"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {data && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-4 overflow-y-auto max-h-64 pr-2"
              >
                <div>
                  <div className="text-slate-500 mb-1">NODES:</div>
                  <div className="grid grid-cols-1 gap-1">
                    {data.nodes.map(n => (
                      <div key={n.id} className="bg-slate-800/50 p-2 border border-slate-700/50 flex items-center justify-between">
                         <span>{n.name} <span className="opacity-40 italic">({n.type})</span></span>
                         <span className={`px-1.5 py-0.5 text-[8px] font-bold ${n.criticality === 'High' ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400'}`}>{n.criticality}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 mb-1">TELEMETRY_ANCHORS:</div>
                  <div className="flex flex-wrap gap-2">
                    {data.telemetryAnchors.map(a => (
                      <span key={a} className="bg-green-900/20 text-green-500 border border-green-900/30 px-2 py-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-2 h-2" /> {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2 bg-indigo-950/20 border border-indigo-900/30 text-[9px] leading-tight text-indigo-400 italic">
                  DETERMINISTIC MODEL READY FOR OSCAL EXPORT. NO NARRATIVE DEVIATIONS DETECTED.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
