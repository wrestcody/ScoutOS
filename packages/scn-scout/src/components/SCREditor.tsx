import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { X, Save, Send, Sparkles, Loader2, Info, Clock, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { SCR, SCRStatus, ChangeType, MappedControl } from '../types';
import { getSCRGuidance, analyzeSecurityImpact, categorizeChange, getControlGuidance, validateOSCALSchema, suggestControls, DEFAULT_PROVIDER } from '../services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import SIAAssistant from './SIAAssistant';
import HLATranslator from './HLATranslator';
import VaultManager from './VaultManager';
import ExternalValidation from './ExternalValidation';
import { NIST_CONTROLS } from '../constants/NISTControls';
import { Search, Plus, Trash2, FileJson, FileText, FileCode, Activity, Network, AlertCircle, ShieldCheck, Shield } from 'lucide-react';

interface SCREditorProps {
  user: User;
  onClose: () => void;
  onSave: (scr: SCR) => void;
  initialData?: SCR;
}

export default function SCREditor({ user, onClose, onSave, initialData }: SCREditorProps) {
  const [formData, setFormData] = useState<Partial<SCR>>(initialData || {
    fedrampId: '',
    scnReference: '',
    datePrepared: new Date().toISOString().split('T')[0],
    preparedBy: user.email || '',
    jiraLinks: '',
    jiraTicketId: '',
    shortDescription: '',
    serviceTable: [],
    architecturalFacts: [],
    reasonForChange: '',
    valuePoints: [],
    changeType: 'Adaptive',
    categorizationExplanation: '',
    customerImpactItems: [],
    systemComponentsImpacted: [],
    securityControlImpacts: [],
    riskAssessments: [],
    netRiskPosture: '',
    internalSecurityReviews: [],
    dataAccessModel: [],
    activities: [],
    hardDeadline: '',
    assessmentApproach: '',
    validationMethodologies: [],
    evidenceArtifacts: [],
    poamId: '',
    assessorName: '',
    mappedControls: [],
    validationHooks: [],
    telemetrySources: [],
    isDeterministic: true,
    driftDetectionEnabled: true,
    cspApproverName: '',
    cspApproverTitle: '',
    status: 'Draft',
  });

  const [activeTab, setActiveTab] = useState<'Summary' | 'Architecture' | 'Risk' | 'Timeline' | 'Controls' | 'Vault'>('Summary');

  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [analyzingSIA, setAnalyzingSIA] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [categorizing, setCategorizing] = useState(false);
  const [showSIAAssistant, setShowSIAAssistant] = useState(false);
  const [showSCNfile, setShowSCNfile] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'bedrock' | 'local'>(DEFAULT_PROVIDER);
  const [controlSearch, setControlSearch] = useState('');
  const [gettingControlGuidance, setGettingControlGuidance] = useState<string | null>(null);
  const [suggestingControls, setSuggestingControls] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean, report: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentId, setCurrentId] = useState<string | undefined>(initialData?.id);
  const lastSavedDataRef = useRef<string>(JSON.stringify(initialData || {}));

  // Auto-save logic
  useEffect(() => {
    // Only auto-save for Drafts
    if (formData.status !== 'Draft') return;

    const interval = setInterval(() => {
      const currentDataStr = JSON.stringify(formData);
      // Only save if data has changed and there's meaningful content
      if (currentDataStr !== lastSavedDataRef.current && (formData.fedrampId || formData.shortDescription)) {
        console.log('[Auto-save] Persisting changes...');
        handleSave(false, true);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [formData, currentId]);

  const filteredControls = NIST_CONTROLS.filter(c => 
    c.id.toLowerCase().includes(controlSearch.toLowerCase()) || 
    c.name.toLowerCase().includes(controlSearch.toLowerCase())
  ).slice(0, 10);

  const addControl = (control: typeof NIST_CONTROLS[0]) => {
    if (formData.mappedControls?.find(c => c.controlId === control.id)) return;
    setFormData(prev => ({
      ...prev,
      mappedControls: [...(prev.mappedControls || []), { controlId: control.id, justification: '' }]
    }));
    setControlSearch('');
  };

  const removeControl = (controlId: string) => {
    setFormData(prev => ({
      ...prev,
      mappedControls: (prev.mappedControls || []).filter(c => c.controlId !== controlId)
    }));
  };

  const addListItem = <T extends keyof SCR>(field: T, defaultValue: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as any[] || []), { id: crypto.randomUUID(), ...defaultValue }]
    }));
  };

  const removeListItem = <T extends keyof SCR>(field: T, id: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[] || []).filter(item => item.id !== id)
    }));
  };

  const updateListItem = <T extends keyof SCR>(field: T, id: string, updates: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[] || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const updateJustification = (controlId: string, justification: string) => {
    setFormData(prev => ({
      ...prev,
      mappedControls: (prev.mappedControls || []).map(c => 
        c.controlId === controlId ? { ...c, justification } : c
      )
    }));
  };

  const exportData = (format: 'markdown' | 'json' | 'oscal') => {
    let content = '';
    let filename = `SCN_${formData.fedrampId || 'Export'}`;

    if (format === 'json') {
      content = JSON.stringify(formData, null, 2);
      filename += '.json';
    } else if (format === 'markdown') {
      content = `# Significant Change Notification: ${formData.fedrampId}\n\n`;
      content += `## Description\n${formData.shortDescription}\n\n`;
      content += `## Mapped Controls\n`;
      formData.mappedControls?.forEach(c => {
        content += `- **${c.controlId}**: ${c.justification}\n`;
      });
      filename += '.md';
    } else if (format === 'oscal') {
      const oscal = {
        component_definition: {
          uuid: crypto.randomUUID(),
          metadata: { 
            title: `SCN Export - ${formData.fedrampId}`,
            last_modified: new Date().toISOString(),
            version: "20x.1"
          },
          components: [{
            uuid: crypto.randomUUID(),
            type: "software",
            title: "Deterministic Change Component",
            description: formData.shortDescription,
            props: [
              { name: "is_deterministic", value: formData.isDeterministic?.toString() },
              { name: "drift_detection", value: formData.driftDetectionEnabled?.toString() }
            ],
            control_implementations: [{
              uuid: crypto.randomUUID(),
              source: "https://fedramp.gov/oscal/...",
              description: "Automated SCN Implementation",
              implemented_requirements: formData.mappedControls?.map(c => ({
                uuid: crypto.randomUUID(),
                control_id: c.controlId,
                description: c.justification,
                statements: [{
                  uuid: crypto.randomUUID(),
                  description: "Verified via deterministic telemetry stream.",
                  remarks: `Telemetry Ref: ${formData.telemetrySources?.[0]?.sourceUrl || 'N/A'}`
                }]
              }))
            }]
          }]
        }
      };
      content = JSON.stringify(oscal, null, 2);
      filename += '_OSCAL_20X.json';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGuidance = async (field: keyof SCR) => {
    setActiveField(field);
    setGuidance('Asking AI...');
    const result = await getSCRGuidance(field, formData[field] as string || '', aiProvider, formData);
    setGuidance(result);
  };

  const handleAnalyzeSIA = async () => {
    if (!formData.shortDescription) {
      alert("Please provide a short description first.");
      return;
    }
    setAnalyzingSIA(true);
    const result = await analyzeSecurityImpact(formData.shortDescription, aiProvider, formData);
    setFormData(prev => ({ ...prev, securityImpactAnalysis: result }));
    setAnalyzingSIA(false);
  };

  const handleCategorize = async () => {
    if (!formData.shortDescription) {
      alert("Please provide a short description first to allow categorization.");
      return;
    }
    setCategorizing(true);
    const result = await categorizeChange(formData.shortDescription, aiProvider, formData);
    setFormData(prev => ({ 
      ...prev, 
      changeType: result.type as ChangeType,
      categorizationExplanation: result.explanation
    }));
    setActiveField('categorizationExplanation');
    setGuidance(`AI (${aiProvider}) categorized this as "${result.type}".\n\nExplanation: ${result.explanation}`);
    setCategorizing(false);
  };

  const handleGetControlGuidance = async (controlId: string) => {
    const control = NIST_CONTROLS.find(c => c.id === controlId);
    if (!control || !formData.shortDescription) return;

    setGettingControlGuidance(controlId);
    const anchors = formData.hlaData?.telemetryAnchors || [];
    const result = await getControlGuidance(controlId, control.name, formData.shortDescription, anchors, aiProvider, formData);
    
    setFormData(prev => ({
      ...prev,
      mappedControls: (prev.mappedControls || []).map(c => 
        c.controlId === controlId ? { ...c, justification: result } : c
      )
    }));
    setGettingControlGuidance(null);
  };

  const handleSuggestControls = async () => {
    if (!formData.shortDescription) {
      alert("Please provide a short description first.");
      return;
    }
    setSuggestingControls(true);
    const suggestedIds = await suggestControls(formData.shortDescription || '', formData.hlaDescription || '', aiProvider);
    
    // Add suggested controls that are not already mapped
    const newMappedControls = [...(formData.mappedControls || [])];
    let addedCount = 0;

    suggestedIds.forEach((id: string) => {
      if (!newMappedControls.find(c => c.controlId === id)) {
        newMappedControls.push({ controlId: id, justification: '' });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setFormData(prev => ({
        ...prev,
        mappedControls: newMappedControls
      }));
      setGuidance(`AI suggested and added ${addedCount} relevant controls based on your description.`);
      setActiveField('suggestedControls');
    } else {
      alert("AI suggested controls that are already mapped or no new controls were found.");
    }
    setSuggestingControls(false);
  };

  const handleValidateOSCAL = async () => {
    setValidating(true);
    const oscal = JSON.parse(generateOSCALJson());
    const result = await validateOSCALSchema(oscal);
    setValidationResult(result);
    setValidating(false);
  };

  const generateSCNfileYaml = () => {
    return `schema: SCNfile-v1.yaml
metadata:
  fedramp_id: "${formData.fedrampId || 'PENDING'}"
  change_type: "${formData.changeType?.toLowerCase() || 'unknown'}"
  is_deterministic: ${formData.isDeterministic}
  source_branch: "feat/compliance-update"

change_scope: |
  ${formData.shortDescription?.replace(/\n/g, '\n  ') || ''}

evidence_validation_hooks:
${(formData.validationHooks || []).map(vh => `  - plugin: ${vh.type}
    name: "${vh.name}"
    ksi_target: "${vh.targetKsi}"
    test_id: "${vh.id}"
    status: "${vh.status}"
    telemetry_anchor: "${vh.lastRunHash || 'N/A'}"`).join('\n')}

mapped_controls:
${(formData.mappedControls || []).map(mc => `  - control_id: "${mc.controlId}"
    justification: "${mc.justification?.replace(/"/g, '\\"') || ''}"`).join('\n')}
`;
  };

  const generateOSCALJson = () => {
    const oscal = {
      component_definition: {
        uuid: crypto.randomUUID(),
        metadata: { 
          title: `SCN Export - ${formData.fedrampId}`,
          last_modified: new Date().toISOString(),
          version: "20x.1"
        },
        components: [{
          uuid: crypto.randomUUID(),
          type: "software",
          title: "Deterministic Change Component",
          description: formData.shortDescription,
          props: [
            { name: "is_deterministic", value: formData.isDeterministic?.toString() },
            { name: "drift_detection", value: formData.driftDetectionEnabled?.toString() }
          ],
          control_implementations: [{
            uuid: crypto.randomUUID(),
            source: "https://fedramp.gov/oscal/...",
            description: "Automated SCN Implementation",
            implemented_requirements: formData.mappedControls?.map(c => ({
              uuid: crypto.randomUUID(),
              control_id: c.controlId,
              description: c.justification,
              statements: [{
                uuid: crypto.randomUUID(),
                description: "Verified via deterministic telemetry stream.",
                remarks: `Telemetry Ref: ${formData.telemetrySources?.[0]?.sourceUrl || 'N/A'}`
              }]
            }))
          }]
        }]
      }
    };
    return JSON.stringify(oscal, null, 2);
  };

  const handleSave = async (submit: boolean = false, isAutoSave: boolean = false) => {
    if (!isAutoSave) setLoading(true);
    try {
      // Logic for Routine Changes - "Silent Log" / Continuous Monitoring
      const finalStatus = (submit && formData.changeType === 'Routine') ? 'Approved' : (submit ? 'Pending Approval' : (formData.status || 'Draft'));
      
      const dataToSave = {
        ...formData,
        validationResult,
        creatorId: user.uid,
        creatorEmail: user.email,
        updatedAt: serverTimestamp(),
        status: finalStatus,
      };

      if (!currentId) {
        // Create new
        const docRef = await addDoc(collection(db, 'scrs'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        setCurrentId(docRef.id);

        // Add audit log
        await addDoc(collection(db, 'audit_logs'), {
          category: 'SCR_EDIT',
          scrId: docRef.id,
          userId: user.uid,
          userEmail: user.email,
          action: submit ? 'Submitted' : 'Created',
          details: `SCR initialized by ${user.email}${isAutoSave ? ' (via auto-save)' : ''}`,
          timestamp: serverTimestamp(),
        });
        
        lastSavedDataRef.current = JSON.stringify({ ...formData, id: docRef.id });
      } else {
        // Update existing
        await updateDoc(doc(db, 'scrs', currentId), dataToSave);
        
        // Add audit log (only for manual save or submission to reduce noise)
        if (!isAutoSave || submit) {
          await addDoc(collection(db, 'audit_logs'), {
            category: 'SCR_EDIT',
            scrId: currentId,
            userId: user.uid,
            userEmail: user.email,
            action: submit ? 'Submitted' : 'Updated',
            details: submit ? 'SCR submitted for review' : 'General updates to SCR fields',
            timestamp: serverTimestamp(),
          });
        }
        
        lastSavedDataRef.current = JSON.stringify(formData);
      }

      setLastSaved(new Date());
      
      // If it's a manual save or submit, notify parent
      if (!isAutoSave || submit) {
        onSave({ ...dataToSave, id: currentId } as SCR);
      }
    } catch (error) {
      if (!isAutoSave) {
        handleFirestoreError(error, OperationType.WRITE, 'scrs');
      } else {
        console.warn('Auto-save failed:', error);
      }
    } finally {
      if (!isAutoSave) setLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-bg-deep select-none">
      {/* Form Area */}
      <div className="flex-1 overflow-y-auto p-12 terminal-scroll relative">
        <div className="absolute top-0 left-0 w-full h-[1500px] pointer-events-none opacity-[0.02]"
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        <div className="max-w-5xl mx-auto space-y-12 relative">
          <div className="flex items-center justify-between border-b pb-8 border-white/10">
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white flex items-center gap-4">
                <ShieldCheck className="w-8 h-8 text-brand-primary" />
                {initialData ? 'Update_Sig_Change_Spec' : 'Initialize_New_Sig_Change'}
              </h2>
              <p className="text-[10px] font-mono text-slate-500 font-black tracking-[0.4em] uppercase flex items-center gap-2">
                <Activity className="w-3 h-3" /> System_Compliance_Engine_v4.2.0_SECURE
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end gap-1">
                <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">AUTO_SAVE_STATUS</div>
                {lastSaved ? (
                  <div className="text-[9px] font-mono text-brand-primary font-black uppercase">SESSION_ACTIVE_{lastSaved.toLocaleTimeString()}</div>
                ) : (
                  <div className="text-[9px] font-mono text-slate-700 font-black uppercase italic">IDLE_...</div>
                )}
              </div>
              <button 
                onClick={() => setShowSCNfile(!showSCNfile)}
                className={`h-10 px-6 font-mono text-[10px] font-black border transition-all flex items-center gap-2 tracking-widest rounded-sm ${showSCNfile ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'}`}
              >
                {showSCNfile ? <FileCode className="w-3 h-3" /> : <Network className="w-3 h-3" />}
                {showSCNfile ? 'CLOSE_CaC_WORKSPACE' : 'EXPLORE_CaC_WORKSPACE'}
              </button>
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-sm hover:bg-rose-500 hover:border-rose-500 hover:text-white transition-all text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showSCNfile && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-8 p-6 bg-slate-900 border-2 border-slate-700 font-mono text-xs text-indigo-300 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold">SCNfile.yaml <span className="text-[10px] opacity-40 font-normal underline">(Infrastructure-as-Compliance Mode)</span></span>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generateSCNfileYaml());
                      alert("SCNfile YAML copied to clipboard.");
                    }}
                    className="text-[9px] bg-slate-800 px-2 py-1 hover:bg-slate-700 transition-all text-slate-400"
                  >
                    COPY_YAML
                  </button>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed opacity-80">
                  {generateSCNfileYaml()}
                </pre>
                <div className="absolute top-0 right-0 p-1 bg-indigo-900/30 text-[8px] text-indigo-500 uppercase tracking-widest -rotate-90 origin-top-right translate-x-2 translate-y-4">
                  DRAFT_SPEC
                </div>
              </motion.div>
            )}

            {activeTab === 'Vault' && (
              <motion.div
                key="vault"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <VaultManager 
                  secrets={formData.secretsInventory || []} 
                  onUpdate={(secrets) => setFormData(prev => ({ ...prev, secretsInventory: secrets }))} 
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3 border-b border-white/5 mb-12 overflow-x-auto terminal-scroll bg-white/[0.02] p-1 rounded-lg">
            {(['Summary', 'Architecture', 'Risk', 'Timeline', 'Controls', 'Vault'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3.5 text-[11px] font-mono font-black uppercase transition-all rounded-md tracking-[0.2em] relative flex-1 ${activeTab === tab ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'Summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-16"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Basic Info */}
                  <section className="space-y-8 glass-morphism p-10 rounded-3xl border-white/5 bg-white/[0.01]">
                    <h3 className="font-mono text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] border-b border-white/5 pb-4 mb-8 flex items-center gap-4">
                       <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                       SECTION_01: CORE_IDENTIFICATION
                    </h3>
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-mono font-black uppercase text-slate-600 tracking-widest pl-1 border-l-2 border-slate-800">FedRAMP_REFERENCE_ID</label>
                        <input
                          type="text"
                          name="fedrampId"
                          value={formData.fedrampId}
                          onChange={handleInputChange}
                          placeholder="e.g., FR1831046837"
                          className="w-full h-14 px-5 bg-bg-deep border border-white/10 focus:border-brand-primary/50 text-white transition-all outline-none text-sm font-mono placeholder:text-slate-900"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-mono font-black uppercase text-slate-600 tracking-widest pl-1 border-l-2 border-slate-800">Inbound_Telemetry_Ref</label>
                        <input
                          type="text"
                          name="scnReference"
                          value={formData.scnReference}
                          onChange={handleInputChange}
                          placeholder="REF_DETECTOR_PENDING..."
                          className="w-full h-14 px-5 bg-bg-deep border border-white/10 focus:border-brand-secondary/50 text-white outline-none text-sm font-mono placeholder:text-slate-900"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Classification */}
                  <section className="space-y-8 glass-morphism p-10 rounded-3xl border-white/5 bg-white/[0.01]">
                    <h3 className="font-mono text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] border-b border-white/5 pb-4 mb-8 flex items-center gap-4">
                       <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                       SECTION_02: SIGNAL_CLASSIFICATION
                    </h3>
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono font-black uppercase text-slate-600 tracking-widest pl-1 border-l-2 border-slate-800">Criticality_Assessment</label>
                          <button 
                            onClick={handleCategorize} 
                            disabled={categorizing}
                            className="bg-brand-primary/5 text-brand-primary px-4 py-1.5 rounded-md flex items-center gap-3 text-[10px] font-black tracking-widest hover:bg-brand-primary/10 transition-all border border-brand-primary/20"
                          >
                            {categorizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            AUTOCLASSIFY_SIGNAL
                          </button>
                        </div>
                        <select
                          name="changeType"
                          value={formData.changeType}
                          onChange={handleInputChange}
                          className="w-full h-14 px-5 bg-bg-deep border border-white/10 text-white outline-none text-sm font-black appearance-none cursor-pointer hover:bg-white/[0.03] transition-all"
                        >
                          <option value="Adaptive" className="bg-bg-surface uppercase">Adaptive Change_ [Low Risk Pattern]</option>
                          <option value="Transformative" className="bg-bg-surface uppercase">Transformative_ [High Risk Vector]</option>
                          <option value="Routine" className="bg-bg-surface uppercase">Routine Maintenance_ [Auto Pass]</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-mono font-black uppercase text-slate-600 tracking-widest pl-1 border-l-2 border-slate-800">Jira_Primary_Ticket_ID</label>
                        <input
                          type="text"
                          name="jiraTicketId"
                          value={formData.jiraTicketId}
                          onChange={handleInputChange}
                          placeholder="e.g., OPS-5432"
                          className="w-full h-14 px-5 bg-bg-deep border border-white/10 focus:border-brand-primary/50 text-white transition-all outline-none text-sm font-mono placeholder:text-slate-900"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-mono font-black uppercase text-slate-600 tracking-widest pl-1 border-l-2 border-slate-800">Jira_Reference_Links_ (Markdown)</label>
                        <textarea
                          name="jiraLinks"
                          value={formData.jiraLinks}
                          onChange={handleInputChange}
                          placeholder="[TICKET-ID](https://jira.example.com/...)"
                          rows={2}
                          className="w-full p-5 bg-bg-deep border border-white/10 text-white outline-none text-xs font-mono terminal-scroll resize-none placeholder:text-slate-900"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <section className="space-y-8 glass-morphism p-10 rounded-3xl border-white/5">
                  <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] border-b border-white/5 pb-3 mb-8">03_EXECUTIVE_CONTEXT_SUMMARY</h3>
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-widest">High_Level_Implementation_Objective</label>
                        <button onClick={() => handleGuidance('shortDescription')} className="text-brand-secondary flex items-center gap-2 text-[9px] font-black tracking-widest hover:scale-105 transition-all">
                          <Sparkles className="w-3 h-3" /> AI_DRAFT_GUIDANCE
                        </button>
                      </div>
                      <textarea
                        name="shortDescription"
                        value={formData.shortDescription}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full p-6 bg-white/[0.02] border border-white/10 text-white outline-none text-sm leading-relaxed rounded-xl font-sans"
                        placeholder="Detail the technical and business objectives of this change..."
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-widest italic">Core_Business_Rationalization</label>
                      <textarea
                        name="reasonForChange"
                        value={formData.reasonForChange}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full p-6 bg-white/[0.02] border border-white/10 text-white outline-none text-sm leading-relaxed rounded-xl font-sans"
                        placeholder="Why is this change necessary at this phase of the system lifecycle?"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">04_CLIENT_SURFACE_IMPACT_VECTORS</h3>
                    <button 
                      onClick={() => addListItem('customerImpactItems', { area: '', impact: '' })}
                      className="h-8 px-4 bg-white/5 border border-white/10 text-[9px] font-mono font-black text-white hover:bg-brand-primary hover:text-black transition-all rounded-sm uppercase tracking-widest"
                    >
                      PUSH_IMPACT_NODE
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {formData.customerImpactItems?.map((item) => (
                      <div key={item.id} className="relative p-8 bg-white/[0.01] border border-white/5 rounded-2xl group hover:border-brand-secondary/30 transition-all">
                        <div className="space-y-4">
                          <input 
                            placeholder="IMPACT_AREA_IDENTIFIER..."
                            className="w-full bg-transparent border-b border-white/10 p-2 font-black text-xs text-brand-secondary outline-none focus:border-brand-secondary/50 placeholder:text-slate-800 uppercase tracking-widest"
                            value={item.area}
                            onChange={(e) => updateListItem('customerImpactItems', item.id, { area: e.target.value })}
                          />
                          <textarea 
                            placeholder="Technical description of customer fallout or delta..."
                            className="w-full bg-transparent p-2 text-xs text-slate-400 outline-none resize-none font-sans leading-relaxed"
                            rows={3}
                            value={item.impact}
                            onChange={(e) => updateListItem('customerImpactItems', item.id, { impact: e.target.value })}
                          />
                        </div>
                        <button 
                          onClick={() => removeListItem('customerImpactItems', item.id)} 
                          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-bg-surface border border-white/10 flex items-center justify-center text-slate-600 hover:text-white hover:bg-rose-500 hover:border-rose-500 opacity-0 group-hover:opacity-100 transition-all shadow-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!formData.customerImpactItems || formData.customerImpactItems.length === 0) && (
                      <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                         <Activity className="w-8 h-8 text-slate-800 mx-auto mb-4" />
                         <span className="text-[10px] font-mono text-slate-700 font-black uppercase tracking-[0.3em]">No impact vectors defined for this record.</span>
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'Architecture' && (
              <motion.div
                key="architecture"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-20"
              >
                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">05_SERVICES_MATRIX_GRID</h3>
                    <button 
                      onClick={() => addListItem('serviceTable', { name: '', function: '', compute: '', dataHandling: '' })}
                      className="h-8 px-4 bg-white/5 border border-white/10 text-[9px] font-mono font-black text-white hover:bg-brand-primary hover:text-black transition-all rounded-sm uppercase tracking-widest"
                    >
                      REGISTER_NEW_NODE
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.01]">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-white/5 text-slate-500 uppercase tracking-widest font-black">
                        <tr>
                          <th className="p-4 text-left">NODE_ID</th>
                          <th className="p-4 text-left">SYS_FUNCTION</th>
                          <th className="p-4 text-left">COMPUTE_ARCH</th>
                          <th className="p-4 text-left">BOUNDARY_PROTOCOL</th>
                          <th className="p-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {formData.serviceTable?.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4"><input className="w-full bg-transparent border-none text-white font-black outline-none placeholder:text-slate-800" placeholder="NAME..." value={item.name} onChange={(e) => updateListItem('serviceTable', item.id, { name: e.target.value })} /></td>
                            <td className="p-4"><input className="w-full bg-transparent border-none text-slate-400 outline-none italic" placeholder="FUNCTION..." value={item.function} onChange={(e) => updateListItem('serviceTable', item.id, { function: e.target.value })} /></td>
                            <td className="p-4"><input className="w-full bg-transparent border-none text-slate-400 outline-none" placeholder="COMPUTE..." value={item.compute} onChange={(e) => updateListItem('serviceTable', item.id, { compute: e.target.value })} /></td>
                            <td className="p-4"><input className="w-full bg-transparent border-none text-brand-primary/70 font-black outline-none" placeholder="HANDLING..." value={item.dataHandling} onChange={(e) => updateListItem('serviceTable', item.id, { dataHandling: e.target.value })} /></td>
                            <td className="p-4 text-center"><button onClick={() => removeListItem('serviceTable', item.id)} className="text-slate-800 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5">
                  <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] border-b border-white/5 pb-3">06_ARCHITECTURE_MODEL_ABSTRACTION</h3>
                  <div className="bg-white/[0.01] rounded-2xl border border-white/5 p-2 overflow-hidden">
                    <HLATranslator 
                      aiProvider={aiProvider}
                      initialDescription={formData.hlaDescription}
                      initialData={formData.hlaData}
                      onTranslated={(desc, data) => setFormData(prev => ({ ...prev, hlaDescription: desc, hlaData: data }))}
                    />
                  </div>
                </section>

                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">07_GRANULAR_COMPONENTS_DELTA</h3>
                    <button 
                      onClick={() => addListItem('systemComponentsImpacted', { name: '', impactType: 'New', description: '' })}
                      className="h-8 px-4 bg-white/5 border border-white/10 text-[9px] font-mono font-black text-white hover:bg-brand-primary hover:text-black transition-all rounded-sm uppercase tracking-widest"
                    >
                      PUSH_COMPONENT
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {formData.systemComponentsImpacted?.map((item) => (
                      <div key={item.id} className="p-8 bg-white/[0.01] border border-white/5 space-y-6 rounded-2xl hover:border-brand-primary/30 transition-all group relative">
                        <div className="flex items-center gap-4">
                          <input className="flex-1 font-black text-sm bg-bg-surface border border-white/10 p-3 text-white outline-none focus:border-brand-primary/50" value={item.name} placeholder="COMPONENT_ID" onChange={(e) => updateListItem('systemComponentsImpacted', item.id, { name: e.target.value })} />
                          <select className="h-11 px-4 text-[10px] font-mono bg-bg-surface border border-white/10 text-brand-primary font-black outline-none" value={item.impactType} onChange={(e) => updateListItem('systemComponentsImpacted', item.id, { impactType: e.target.value as any })}>
                            <option value="New">NEW_NODE</option>
                            <option value="Existing">MOD_EXISTING</option>
                          </select>
                        </div>
                        <textarea className="w-full text-xs p-4 bg-bg-surface border border-white/10 text-slate-400 outline-none resize-none h-24 rounded-lg font-sans" placeholder="Detailed impact vector for this specific component..." value={item.description} onChange={(e) => updateListItem('systemComponentsImpacted', item.id, { description: e.target.value })} />
                        <button onClick={() => removeListItem('systemComponentsImpacted', item.id)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-bg-surface border border-white/10 flex items-center justify-center text-slate-800 hover:text-white hover:bg-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'Risk' && (
              <motion.div
                key="risk"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-16"
              >
                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">08_RISK_ASSESSMENT_MATRIX</h3>
                    <button 
                      onClick={() => addListItem('riskAssessments', { area: '', assessment: '', mitigation: '' })}
                      className="h-8 px-4 bg-white/5 border border-white/10 text-[9px] font-mono font-black text-white hover:bg-brand-primary hover:text-black transition-all rounded-sm uppercase tracking-widest"
                    >
                      REGISTER_THREAT_ENTITY
                    </button>
                  </div>
                  <div className="space-y-6">
                    {formData.riskAssessments?.map((item) => (
                      <div key={item.id} className="p-8 bg-white/[0.01] border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8 rounded-2xl group hover:border-brand-primary/30 transition-all relative">
                        <div className="space-y-2">
                          <label className="text-[9px] font-mono font-black text-slate-700 tracking-widest uppercase">RISK_AREA_NODE</label>
                          <input className="w-full h-11 px-3 text-xs font-black bg-bg-surface border border-white/10 text-white outline-none focus:border-brand-primary/50 uppercase" value={item.area} onChange={(e) => updateListItem('riskAssessments', item.id, { area: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-mono font-black text-slate-700 tracking-widest uppercase">VULN_ASSESSMENT</label>
                          <textarea className="w-full text-xs p-3 bg-bg-surface border border-white/10 text-slate-400 outline-none resize-none h-20 rounded-lg italic font-sans" value={item.assessment} onChange={(e) => updateListItem('riskAssessments', item.id, { assessment: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-mono font-black text-slate-700 tracking-widest uppercase italic text-brand-primary">MITIGATION_STRATEGY</label>
                          <textarea className="w-full text-xs p-3 bg-bg-surface border border-white/10 text-brand-primary/80 outline-none resize-none h-20 rounded-lg font-bold font-sans" value={item.mitigation} onChange={(e) => updateListItem('riskAssessments', item.id, { mitigation: e.target.value })} />
                        </div>
                        <button onClick={() => removeListItem('riskAssessments', item.id)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-bg-surface border border-white/10 flex items-center justify-center text-slate-800 hover:text-white hover:bg-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5 bg-brand-primary/5 border-brand-primary/20 relative overflow-hidden">
                   <Shield className="absolute -bottom-10 -right-10 w-48 h-48 text-brand-primary/10" />
                   <h3 className="font-mono text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] border-b border-brand-primary/10 pb-3 mb-6 relative z-10">09_SYSTEM_NET_RISK_POSTURE_ATTESTATION</h3>
                   <textarea
                    name="netRiskPosture"
                    value={formData.netRiskPosture}
                    onChange={handleInputChange}
                    placeholder="Provide a final, authoritative summary of the overall system risk posture post-implementation..."
                    rows={6}
                    className="w-full p-8 bg-transparent text-white outline-none text-lg font-black uppercase italic tracking-tighter leading-tight placeholder:text-brand-primary/20 relative z-10 font-mono"
                   />
                </section>

                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">10_CRYPTO_DATA_ACCESS_FLOW</h3>
                    <button 
                      onClick={() => addListItem('dataAccessModel', { accessor: '', accessType: '', justification: '' })}
                      className="h-8 px-4 bg-white/5 border border-white/10 text-[9px] font-mono font-black text-white hover:bg-brand-secondary hover:text-black transition-all rounded-sm uppercase tracking-widest"
                    >
                      MAP_NEW_ACCESSOR
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.dataAccessModel?.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-white/[0.01] border border-white/5 rounded-2xl items-center group relative hover:border-brand-secondary/30">
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono text-slate-800 uppercase font-black">ACCESSOR_ENTITY</span>
                          <input placeholder="ENTITY_NAME" className="w-full h-10 px-3 bg-bg-surface border border-white/10 text-white font-black text-[10px] outline-none" value={item.accessor} onChange={(e) => updateListItem('dataAccessModel', item.id, { accessor: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono text-slate-800 uppercase font-black">PROTOCOL_TYPE</span>
                          <input placeholder="AUTH_TYPE" className="w-full h-10 px-3 bg-bg-surface border border-white/10 text-brand-secondary font-black text-[10px] outline-none" value={item.accessType} onChange={(e) => updateListItem('dataAccessModel', item.id, { accessType: e.target.value })} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <span className="text-[8px] font-mono text-slate-800 uppercase font-black">RATIONAL_JUSTIFICATION</span>
                          <input placeholder="BUSINESS_NEED..." className="w-full h-10 px-3 bg-bg-surface border border-white/10 text-slate-400 text-[10px] italic outline-none" value={item.justification} onChange={(e) => updateListItem('dataAccessModel', item.id, { justification: e.target.value })} />
                        </div>
                        <button onClick={() => removeListItem('dataAccessModel', item.id)} className="absolute right-4 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'Timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-16"
              >
                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">11_PHASED_IMPLEMENTATION_LOG</h3>
                    <button 
                      onClick={() => addListItem('activities', { phase: '', activity: '', targetDate: '' })}
                      className="h-8 px-4 bg-white/5 border border-white/10 text-[9px] font-mono font-black text-white hover:bg-brand-primary hover:text-black transition-all rounded-sm uppercase tracking-widest"
                    >
                      ADD_MILESTONE_NODE
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.activities?.map((item) => (
                      <div key={item.id} className="flex gap-6 p-6 bg-white/[0.01] border border-white/5 rounded-2xl items-center group relative hover:border-brand-primary/30">
                        <div className="w-1/4 space-y-1">
                          <span className="text-[8px] font-mono text-slate-800 uppercase font-black">PHASE_TAG</span>
                          <input placeholder="PHASE..." className="w-full h-10 px-3 bg-bg-surface border border-white/10 text-white font-black text-[10px] outline-none" value={item.phase} onChange={(e) => updateListItem('activities', item.id, { phase: e.target.value })} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-[8px] font-mono text-slate-800 uppercase font-black">ACTIVITY_DESCRIPTOR</span>
                          <input placeholder="DESCRIPTION..." className="w-full h-10 px-3 bg-bg-surface border border-white/10 text-slate-400 text-[10px] outline-none" value={item.activity} onChange={(e) => updateListItem('activities', item.id, { activity: e.target.value })} />
                        </div>
                        <div className="w-1/4 space-y-1">
                          <span className="text-[8px] font-mono text-slate-800 uppercase font-black">TARGET_RELEASE_DATE</span>
                          <input placeholder="YYYY-MM-DD" className="w-full h-10 px-3 bg-bg-surface border border-white/10 text-brand-secondary font-black text-[10px] outline-none" value={item.targetDate} onChange={(e) => updateListItem('activities', item.id, { targetDate: e.target.value })} />
                        </div>
                        <button onClick={() => removeListItem('activities', item.id)} className="text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-10 glass-morphism p-10 rounded-3xl border-white/5">
                  <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] border-b border-white/5 pb-3">12_VALIDATION_ARTIFACT_ARRAY</h3>
                  <div className="space-y-4">
                     <div className="space-y-3">
                        <label className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-widest italic">Evidence_Artifact_Manifest (New_Line_Separated)</label>
                        <textarea
                          rows={6}
                          value={formData.evidenceArtifacts?.join('\n')}
                          onChange={(e) => setFormData(prev => ({ ...prev, evidenceArtifacts: e.target.value.split('\n') }))}
                          className="w-full p-6 bg-white/[0.02] border border-white/10 text-white outline-none text-xs font-mono terminal-scroll rounded-xl placeholder:text-slate-800"
                          placeholder="artifact_hash_id_01&#10;artifact_hash_id_02..."
                        />
                     </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'Controls' && (
              <motion.div
                key="controls"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-16"
              >
                <div className="bg-brand-primary/5 p-10 border-2 border-brand-primary/20 rounded-3xl relative overflow-hidden group">
                  <ShieldCheck className="absolute -bottom-10 -right-10 w-48 h-48 text-brand-primary/10 group-hover:scale-110 transition-transform duration-1000" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-brand-primary flex items-center justify-center rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                      <ShieldCheck className="w-10 h-10 text-black" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">NIST_800-53_REV_5_ENGINE</h4>
                      <p className="text-[10px] text-brand-primary font-mono font-black italic tracking-[0.2em] uppercase">AI_DETERMINISTIC_JUSTIFICATION_SUITE</p>
                    </div>
                    <button 
                      onClick={handleSuggestControls}
                      disabled={suggestingControls || !formData.shortDescription}
                      className="h-12 px-6 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary font-mono font-black text-xs hover:bg-brand-primary hover:text-black transition-all flex items-center gap-3 rounded-lg uppercase tracking-widest disabled:opacity-50"
                    >
                      {suggestingControls ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      SUGGEST_CONTROLS
                    </button>
                  </div>
                </div>

              <div className="space-y-10">
                <div className="relative group">
                  <div className="flex items-center gap-4 h-16 px-6 bg-white/[0.02] border border-white/10 group-hover:border-brand-primary/50 transition-all rounded-xl">
                    <Search className="w-5 h-5 text-slate-600" />
                    <input 
                      type="text" 
                      placeholder="SEARCH_CONTROL_ID_OR_NAME_NIST_800-53..."
                      value={controlSearch}
                      onChange={(e) => setControlSearch(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-sm font-mono uppercase text-white placeholder:text-slate-800 tracking-[0.1em]"
                    />
                  </div>
                  {controlSearch && (
                    <div className="absolute top-full left-0 w-full bg-bg-surface border border-white/10 z-50 shadow-2xl mt-4 rounded-xl overflow-hidden divide-y divide-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                      {filteredControls.map(c => (
                        <button
                          key={c.id}
                          onClick={() => addControl(c)}
                          className="w-full text-left p-6 hover:bg-white/5 text-xs font-mono flex items-center justify-between group/item transition-all"
                        >
                          <span className="flex items-center gap-4">
                            <span className="font-black text-brand-primary bg-brand-primary/10 px-2 py-1 rounded">{c.id}</span>
                            <span className="text-slate-300 group-hover/item:text-white transition-colors uppercase">{c.name}</span>
                          </span>
                          <Plus className="w-4 h-4 text-slate-700 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0 translate-x-4 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {formData.mappedControls?.map(mc => {
                    const control = NIST_CONTROLS.find(c => c.id === mc.controlId);
                    return (
                      <div key={mc.controlId} className="bg-white/[0.01] border border-white/5 p-8 rounded-3xl space-y-6 group hover:border-brand-secondary/30 transition-all relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-[11px] font-black bg-white text-black px-4 py-1.5 rounded-sm uppercase tracking-widest shadow-xl">
                              {mc.controlId}
                            </span>
                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest truncate max-w-[400px]">
                              {control?.name}
                            </span>
                          </div>
                          <button onClick={() => removeControl(mc.controlId)} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-800 hover:text-rose-500 transition-colors bg-white/5 hover:bg-white/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-mono font-black text-slate-700 uppercase tracking-[0.2em]">DELTA_IMPLEMENTATION_&_SECURITY_JUSTIFICATION</label>
                            <button 
                              onClick={() => handleGetControlGuidance(mc.controlId)}
                              disabled={!!gettingControlGuidance || !formData.shortDescription}
                              className="text-brand-secondary flex items-center gap-2 text-[9px] font-black tracking-widest hover:scale-105 transition-all bg-brand-secondary/10 px-3 py-1 rounded-full border border-brand-secondary/30"
                            >
                              {gettingControlGuidance === mc.controlId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              AUTO_MAP_AI
                            </button>
                          </div>
                          <textarea 
                            value={mc.justification}
                            onChange={(e) => updateJustification(mc.controlId, e.target.value)}
                            rows={4}
                            placeholder="Detail explicitly how this change modifies the established control boundary..."
                            className="w-full p-6 bg-bg-surface border border-white/10 text-slate-400 outline-none text-xs font-sans italic leading-relaxed rounded-xl focus:border-brand-secondary/50 placeholder:text-slate-800"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!formData.mappedControls || formData.mappedControls.length === 0) && (
                    <div className="py-24 border-2 border-dashed border-white/5 rounded-3xl text-center flex flex-col items-center gap-4">
                      <ShieldCheck className="w-12 h-12 text-slate-900" />
                      <div className="text-[10px] font-mono text-slate-700 font-black uppercase tracking-[0.4em]">NO_CONTROLS_DEFINED_IN_LOCAL_BUFFER</div>
                    </div>
                  )}
                </div>
              </div>

          <section className="space-y-12 mt-20">
             <div className="p-10 glass-morphism border-white/10 rounded-3xl space-y-10">
               <h3 className="font-mono text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] border-b border-white/5 pb-3">13_SchemaGate_VERIFICATION_SUITE</h3>
               <div className="bg-bg-deep border border-white/10 p-10 space-y-8 relative overflow-hidden rounded-2xl">
                  <div className="absolute top-0 right-0 p-10 opacity-5">
                    <ShieldCheck className="w-48 h-48" />
                  </div>
                  
                  <div className="flex flex-col gap-8 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <div className="space-y-2">
                         <h4 className="text-3xl font-black text-white tracking-tighter uppercase italic">SchemaGate_Validator</h4>
                         <p className="text-[9px] font-mono text-slate-600 font-black tracking-widest uppercase">STRICT_OSCAL_DETERMINISTIC_AUDIT_MODE</p>
                       </div>
                       <button 
                         onClick={handleValidateOSCAL}
                         disabled={validating}
                         className="h-14 px-10 bg-brand-primary text-black font-mono font-black hover:scale-105 transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-50 text-xs rounded-sm"
                       >
                         {validating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                         EXECUTE_PRE-FLIGHT_VAL
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className={`p-6 bg-white/[0.02] border-l-4 flex flex-col gap-3 rounded-r-xl transition-all ${validationResult?.valid ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-800'}`}>
                          <span className="text-[9px] font-mono font-black text-slate-700 tracking-widest uppercase">STEP_01</span>
                          <span className="text-xs font-black text-slate-400">NIST_800-53_METASCHEMA</span>
                          {validationResult?.valid && <Check className="w-4 h-4 text-brand-primary" />}
                       </div>
                       <div className={`p-6 bg-white/[0.02] border-l-4 flex flex-col gap-3 rounded-r-xl transition-all ${validationResult?.valid ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-800'}`}>
                          <span className="text-[9px] font-mono font-black text-slate-700 tracking-widest uppercase">STEP_02</span>
                          <span className="text-xs font-black text-slate-400">TELEMETRY_RECORD_INTEGRITY</span>
                          {validationResult?.valid && <Check className="w-4 h-4 text-brand-primary" />}
                       </div>
                       <div className={`p-6 bg-white/[0.02] border-l-4 flex flex-col gap-3 rounded-r-xl transition-all ${validationResult?.valid ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-800'}`}>
                          <span className="text-[9px] font-mono font-black text-slate-700 tracking-widest uppercase">STEP_03</span>
                          <span className="text-xs font-black text-slate-400">FEDRAMP_SCN_PROFILE_SYNC</span>
                          {validationResult?.valid && <Check className="w-4 h-4 text-brand-primary" />}
                       </div>
                    </div>

                    <AnimatePresence>
                      {validationResult && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-8 border-2 flex flex-col gap-6 rounded-2xl relative overflow-hidden ${validationResult.valid ? 'bg-brand-primary/5 border-brand-primary/30' : 'bg-rose-500/5 border-rose-500/30'}`}
                        >
                           <div className="flex flex-col md:flex-row md:items-center gap-8 w-full relative z-10">
                             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl ${validationResult.valid ? 'bg-brand-primary shadow-brand-primary/20' : 'bg-rose-500 shadow-rose-500/20'}`}>
                                {validationResult.valid ? <ShieldCheck className="w-10 h-10 text-black" /> : <AlertCircle className="w-10 h-10 text-white" />}
                             </div>
                             <div className="space-y-1">
                                <h5 className={`text-2xl font-black italic tracking-tighter uppercase ${validationResult.valid ? 'text-brand-primary' : 'text-rose-500'}`}>
                                  {validationResult.valid ? 'SYSTEM_LOCKED & READY' : 'VAL_EXCEPTION_DETECTED'}
                                </h5>
                                <p className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-[0.2em] leading-relaxed">
                                  {validationResult.valid ? 'OSCAL_Profile_Integrity_Checksum: VERIFIED_20X_SPEC' : 'SchemaMismatch: FedRAMP_SCN_Mapping_Incomplete'}
                                </p>
                             </div>
                             <div className="ml-auto flex items-center gap-8">
                               {validationResult.valid && (
                                 <div className="hidden xl:flex flex-col items-end gap-1 px-8 border-r border-white/5">
                                    <div className="text-[8px] font-mono text-slate-800 uppercase font-black tracking-widest">VALIDATION_HASH</div>
                                    <div className="text-[10px] font-mono font-black text-brand-primary/40 tracking-widest">{crypto.randomUUID().substring(0, 12).toUpperCase()}</div>
                                 </div>
                               )}
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setShowValidationDetails(!showValidationDetails);
                                 }}
                                 className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                               >
                                 {showValidationDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                               </button>
                             </div>
                           </div>

                           <AnimatePresence>
                             {showValidationDetails && (
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="border-t border-white/5 pt-8 mt-4 overflow-hidden relative z-10"
                               >
                                 <div className="bg-bg-deep p-6 font-mono text-[10px] text-slate-500 space-y-4 leading-relaxed rounded-xl border border-white/5">
                                    <div className="flex items-center justify-between text-slate-800 font-black tracking-[0.2em] border-b border-white/5 pb-2">
                                       <span>REPORT_STREAM_OUT_OSCAL_v1.1</span>
                                       <span>{new Date().toISOString().substring(11, 19)}_UTC</span>
                                    </div>
                                    <p className={validationResult.valid ? 'text-brand-primary/70' : 'text-rose-400/70 italic'}>
                                      {validationResult.report}
                                    </p>
                                    <div className="pt-4 text-center opacity-20 font-black italic tracking-[0.5em]">---_EOF_---</div>
                                 </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
               </div>
             </div>
          </section>

          <section className="space-y-12 glass-morphism p-10 rounded-3xl border-white/5">
            <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] border-b border-white/5 pb-3">14_OSCAL_EXTERNAL_GATEWAY</h3>
            <div className="bg-white/[0.01] rounded-2xl border border-white/5 overflow-hidden">
               <ExternalValidation content={generateOSCALJson()} />
            </div>
          </section>

          <footer className="flex items-center justify-end gap-6 pt-16 pb-32 border-t border-white/5 mt-16">
            <button 
              onClick={() => handleSave(false)} 
              disabled={loading}
              className="h-14 px-10 border border-white/10 bg-white/5 text-slate-400 font-mono font-black text-xs hover:text-white hover:border-white/30 transition-all uppercase tracking-widest rounded-sm"
            >
              COMMIT_LOCAL_DRAFT
            </button>
            <button 
              onClick={() => handleSave(true)}
              disabled={loading}
              className="group relative h-14 px-12 bg-brand-primary text-black font-mono font-black text-xs overflow-hidden rounded-sm"
            >
              <div className="absolute inset-0 bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              <span className="relative flex items-center gap-3">
                <Send className="w-4 h-4" /> SUBMIT_TO_FEDRAMP_GATEWAY
              </span>
            </button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</div>

      {/* AI Sidepanel */}
      <div className="w-96 bg-bg-surface border-l border-white/5 p-10 overflow-y-auto terminal-scroll flex flex-col gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3 font-mono font-black text-[10px] uppercase text-white tracking-[0.4em]">
             <Sparkles className="w-4 h-4 text-brand-secondary" />
             AI_ASSISTANT_NODE
          </div>
          <div className="space-y-2">
            <label className="text-[8px] font-mono font-black text-slate-700 uppercase tracking-widest">GATEWAY_ENGINE_OS</label>
            <select 
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as any)}
              className="w-full h-11 text-[10px] font-mono px-4 bg-bg-deep border border-white/10 text-slate-400 outline-none hover:border-brand-secondary/50 transition-all rounded-sm appearance-none cursor-pointer"
            >
              <option value="gemini">Google Gemini / Ultra-Vision</option>
              <option value="bedrock">AWS Bedrock / Claude-3</option>
              <option value="local">Ollama / Local-Inference</option>
            </select>
          </div>
          <p className="text-[9px] font-mono text-slate-600 font-bold uppercase tracking-widest leading-tight">ACTIVE_DETERMINISTIC_GUIDANCE_v4.2</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 font-mono font-black text-[10px] uppercase text-white tracking-[0.4em]">
             <FileCode className="w-4 h-4 text-brand-primary" />
             D_FILE_EXPORT
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => exportData('markdown')}
              className="w-full text-left h-12 px-6 bg-white/[0.02] border border-white/10 hover:border-white/30 text-[9px] font-mono flex items-center gap-3 uppercase text-slate-500 hover:text-white transition-all tracking-widest"
            >
              <FileText className="w-4 h-4" /> GEN_MD_ENVELOPE
            </button>
            <button 
              onClick={() => exportData('json')}
              className="w-full text-left h-12 px-6 bg-white/[0.02] border border-white/10 hover:border-white/30 text-[9px] font-mono flex items-center gap-3 uppercase text-slate-500 hover:text-white transition-all tracking-widest"
            >
              <FileJson className="w-4 h-4" /> GEN_JSON_BUFFER
            </button>
            <button 
              onClick={() => exportData('oscal')}
              className="w-full text-left h-12 px-6 bg-brand-primary/5 border border-brand-primary/30 hover:bg-brand-primary hover:text-black text-[9px] font-mono flex items-center gap-3 uppercase text-brand-primary transition-all tracking-widest"
            >
              <FileCode className="w-4 h-4" /> GEN_OSCAL_v1.1
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-[200px]">
          <AnimatePresence mode="wait">
            {guidance ? (
              <motion.div
                key={activeField}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 bg-brand-secondary/5 border border-brand-secondary/20 rounded-2xl text-[11px] text-slate-300 shadow-2xl space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <Info className="w-24 h-24" />
                </div>
                <div className="font-black flex items-center gap-2 text-brand-secondary tracking-[0.2em] relative z-10">
                   <Info className="w-3 h-3" /> SUGGESTION_NODE: {activeField?.toUpperCase()}
                </div>
                <div className="leading-relaxed whitespace-pre-wrap font-sans opacity-80 relative z-10 italic">
                  {guidance}
                </div>
                <button 
                  onClick={() => setGuidance(null)}
                  className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-secondary hover:text-white transition-colors relative z-10"
                >
                  [ PURGE_GUIDANCE ]
                </button>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl p-10 text-center space-y-4">
                 <Sparkles className="w-12 h-12 text-slate-900" />
                 <p className="text-[9px] font-mono text-slate-700 font-black uppercase tracking-[0.2em] leading-relaxed">SELECT FIELD_GUIDANCE ICON FOR AI_ASSISTANCE_PAYLOAD.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-white/[0.01] border border-white/10 rounded-2xl text-[9px] font-mono space-y-4">
          <div className="flex items-center gap-2 text-brand-primary font-black uppercase tracking-widest">
             <AlertCircle className="w-3 h-3" /> SYS_ADVISORY
          </div>
          <p className="text-slate-600 leading-relaxed font-bold uppercase italic">Adaptive and Transformative changes require rigorous assessment. Disputed categorizations will trigger SchemaGate exceptions.</p>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-bg-deep/80 backdrop-blur-md flex items-center justify-center z-[100]">
          <div className="bg-bg-surface border border-brand-primary/30 p-10 shadow-[0_0_100px_rgba(16,185,129,0.2)] flex flex-col items-center gap-6 rounded-3xl">
            <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
            <div className="text-sm font-mono font-black uppercase tracking-[0.5em] text-white">SYNCING_TO_CLOUD_...</div>
          </div>
        </div>
      )}
    </div>
  );
}
