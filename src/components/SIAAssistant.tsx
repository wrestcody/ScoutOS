import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, ArrowLeft, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { generateSIAFromInterview } from '../services/aiService';
import { SCR } from '../types';

interface SIAAssistantProps {
  onComplete: (sia: string) => void;
  onClose: () => void;
  aiProvider: 'gemini' | 'bedrock' | 'local';
  scrContext?: Partial<SCR>;
}

const steps = [
  {
    id: 'system',
    question: "Which systems or sub-systems are primarily involved in this change?",
    placeholder: "e.g., AWS S3 storage layer, User Authentication Service, edge load balancers..."
  },
  {
    id: 'nature',
    question: "What is the technical nature of the change?",
    placeholder: "e.g., Upgrading database engine from v12 to v15, implementing MFA for administrative access..."
  },
  {
    id: 'cia_impact',
    question: "Does this change impact the Confidentiality, Integrity, or Availability (CIA) of the system? How?",
    placeholder: "Describe any potential downtime or change in data sensitivity..."
  },
  {
    id: 'controls',
    question: "Are there any specific NIST 800-53 controls you know will be affected?",
    placeholder: "e.g., AC-2, IA-2, SC-7..."
  },
  {
    id: 'external',
    question: "Will this change affect connectivity to external systems or FedRAMP services (e.g. ZenDesk, AWS)?",
    placeholder: "Describe any new external connections or changed APIs..."
  }
];

export default function SIAAssistant({ onComplete, onClose, aiProvider, scrContext }: SIAAssistantProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompiling, setIsCompiling] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompiling(true);
    const result = await generateSIAFromInterview(answers, aiProvider, scrContext);
    onComplete(result);
    setIsCompiling(false);
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white border-2 border-[#141414] w-full max-w-2xl shadow-[16px_16px_0px_0px_rgba(20,20,20,1)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-[#141414] bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold tracking-tight text-xl uppercase">SIA Guided Interview</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white border-2 border-transparent hover:border-[#141414] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 w-full">
          <motion.div 
            className="h-full bg-blue-600" 
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {!isCompiling ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest block font-bold">
                    STEP_{currentStep + 1}_OF_{steps.length}
                  </span>
                  <h3 className="text-2xl font-bold font-sans leading-tight">
                    {currentStepData.question}
                  </h3>
                </div>

                <textarea
                  autoFocus
                  className="w-full p-4 border-2 border-[#141414] min-h-[150px] outline-none font-sans text-lg focus:bg-blue-50 transition-colors"
                  placeholder={currentStepData.placeholder}
                  value={answers[currentStepData.id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentStepData.id]: e.target.value }))}
                />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center py-12 space-y-6 text-center"
              >
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold uppercase tracking-tight">Compiling Intelligence</h3>
                  <p className="text-sm font-mono opacity-50">GEN_AI: MAPPING_USER_ANSWERS_TO_NIST_800-53_REV5_CONTROLS...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!isCompiling && (
          <div className="p-6 border-t-2 border-[#141414] bg-gray-50 flex items-center justify-between">
            <button 
              disabled={currentStep === 0}
              onClick={handleBack}
              className="px-6 py-2 border-2 border-[#141414] font-mono font-bold flex items-center gap-2 hover:bg-white disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" /> PREVIOUS
            </button>
            <button 
              onClick={handleNext}
              disabled={!answers[currentStepData.id]}
              className="px-8 py-2 bg-[#141414] text-white border-2 border-[#141414] font-mono font-bold flex items-center gap-2 hover:bg-[#2a2a2a] disabled:opacity-30"
            >
              {currentStep === steps.length - 1 ? 'FINALIZE_SIA' : 'CONTINUE'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
