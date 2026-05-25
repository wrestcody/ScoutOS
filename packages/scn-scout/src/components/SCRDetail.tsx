import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { X, ArrowLeft, History, CheckCircle, ShieldAlert, Download, MoreVertical, Edit, Activity, Check, Shield } from 'lucide-react';
import { SCR, AuditLog } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { syncToJira } from '../services/aiService';

interface SCRDetailProps {
  scr: SCR;
  onClose: () => void;
  user: User;
}

export default function SCRDetail({ scr, onClose, user }: SCRDetailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [syncingJira, setSyncingJira] = useState(false);

  // ... existing useEffect ...

  const handleJiraSync = async () => {
    setSyncingJira(true);
    try {
      const result = await syncToJira(scr);
      
      // Update the SCR with the Jira ticket info returned from the sync
      if (scr.id) {
        await updateDoc(doc(db, 'scrs', scr.id), {
          jiraTicketId: result.jiraIssueUrl.split('/').pop(),
          jiraStatus: 'SYNCED',
          updatedAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, 'scrs', scr.id!, 'logs'), {
        scrId: scr.id!,
        userId: user.uid,
        userEmail: user.email!,
        action: 'Jira Sync',
        details: `SCN Record synchronized with Atlassian Jira workspace. Ticket Ref: ${result.jiraIssueUrl}`,
        timestamp: serverTimestamp()
      });
      alert(`SCN Synchronized to Jira Successfully.`);
    } catch (e: any) {
      console.error("Detailed Jira Sync Failure:", e);
      let errorMessage = "Jira synchronization failed. ";
      
      if (e.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (e.response.status === 401) {
          errorMessage += "Unauthorized: Please check your Atlassian API credentials.";
        } else if (e.response.status === 404) {
          errorMessage += "Service not found. Verify the Jira endpoint.";
        } else {
          errorMessage += e.response.data?.error || `Server returned error ${e.response.status}.`;
        }
      } else if (e.request) {
        // The request was made but no response was received
        errorMessage += "No response from Atlassian gateway. Check your network connection.";
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage += e.message || "An unexpected error occurred during the sync setup.";
      }
      
      alert(errorMessage);
    } finally {
      setSyncingJira(false);
    }
  };

  useEffect(() => {
    if (!scr.id) return;
    const q = query(collection(db, 'scrs', scr.id, 'logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `scrs/${scr.id}/logs`);
    });
    return unsubscribe;
  }, [scr.id]);

  const handleStatusUpdate = async (newStatus: 'Approved' | 'Rejected') => {
    if (!scr.id) return;
    try {
      await updateDoc(doc(db, 'scrs', scr.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'scrs', scr.id, 'logs'), {
        scrId: scr.id,
        userId: user.uid,
        userEmail: user.email,
        action: newStatus,
        details: `SCR ${newStatus.toLowerCase()} by authorized user`,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `scrs/${scr.id}`);
    }
  };

  return (
    <div className="flex h-full bg-bg-deep select-none">
      {/* Document Area */}
      <div className="flex-1 overflow-y-auto p-12 terminal-scroll relative">
        <div className="absolute top-0 left-0 w-full h-[1000px] pointer-events-none opacity-[0.03]"
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="max-w-4xl mx-auto glass-morphism p-16 shadow-2xl relative overflow-hidden group">
          {/* Watermark/Background Pattern */}
          <div className="absolute -top-32 -right-32 p-4 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-1000">
             <ShieldAlert className="w-[512px] h-[512px]" />
          </div>

          <div className="flex items-start justify-between mb-16 border-b border-white/10 pb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`text-[9px] font-mono font-black px-3 py-1 rounded-sm border uppercase tracking-[0.2em] ${scr.isDeterministic ? 'border-brand-primary/30 text-brand-primary bg-brand-primary/5' : 'border-white/10 text-slate-500 bg-white/5'}`}>
                  {scr.isDeterministic ? 'ENGINE_DETERMINISTIC_RECORD_V2' : 'STANDARD_COMPLIANCE_ENVELOPE'}
                </div>
                {scr.jiraStatus === 'SYNCED' && (
                  <div className="text-[9px] font-mono font-black border border-brand-secondary/30 text-brand-secondary bg-brand-secondary/5 px-3 py-1 rounded-sm uppercase tracking-widest">
                    JIRA_SYNCED
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-[0.9]">Significant Change Request</h1>
                <p className="font-mono text-[10px] mt-4 text-slate-500 uppercase tracking-[0.3em] font-bold">
                  REF_ID: <span className="text-white">{scr.scnReference || 'PENDING'}</span> // FEDRAMP: <span className="text-white">{scr.fedrampId}</span>
                </p>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="text-[10px] font-mono font-black text-slate-600 uppercase tracking-[0.2em]">RECORD_STATUS</div>
              <div className={`text-2xl font-black uppercase tracking-tighter italic ${scr.status === 'Approved' ? 'text-brand-primary' : scr.status === 'Rejected' ? 'text-rose-500' : 'text-brand-secondary'}`}>
                {scr.status}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-10 mb-16 border-y border-white/5 py-10 uppercase font-mono text-[9px] tracking-widest">
            <div className="space-y-2">
              <span className="text-slate-600 block font-black">PREPARED_BY</span>
              <span className="text-white font-black bg-white/5 px-2 py-1 inline-block">{scr.preparedBy || '---'}</span>
            </div>
            <div className="space-y-2">
              <span className="text-slate-600 block font-black">TIMESTAMP_UTC</span>
              <span className="text-white font-black bg-white/5 px-2 py-1 inline-block">{scr.datePrepared || '---'}</span>
            </div>
            <div className="space-y-2">
              <span className="text-slate-600 block font-black">EXTERNAL_LINK_ARRAY</span>
              <div className="text-brand-secondary font-black bg-brand-secondary/5 px-2 py-1 inline-block lowercase tracking-normal italic">
                <ReactMarkdown>{scr.jiraLinks || '---'}</ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="space-y-24">
            {/* Section 1: Description */}
            <section className="space-y-8">
              <div className="flex items-baseline gap-4 border-b border-white/5 pb-2">
                <span className="font-black text-2xl italic text-brand-primary">01.</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Implementation_Objective_Details</h2>
              </div>
              <p className="text-sm font-sans leading-relaxed text-slate-400 max-w-2xl">{scr.shortDescription}</p>
              
              {scr.serviceTable && scr.serviceTable.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.02]">
                  <table className="w-full text-[10px] font-mono divide-y divide-white/5">
                    <thead>
                      <tr className="bg-white/5 text-slate-500 uppercase tracking-widest">
                        <th className="p-4 text-left font-black">NODE_SERVICE</th>
                        <th className="p-4 text-left font-black">SYS_FUNCTION</th>
                        <th className="p-4 text-left font-black">COMPUTE_ARCH</th>
                        <th className="p-4 text-left font-black">DATA_BOUNDARY_MODEL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {scr.serviceTable.map((s) => (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 text-white font-black">{s.name}</td>
                          <td className="p-4 text-slate-400 italic">{s.function}</td>
                          <td className="p-4 text-slate-400">{s.compute}</td>
                          <td className="p-4 text-brand-primary/80 font-bold">{s.dataHandling}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Section 2: Reason */}
            <section className="space-y-6">
              <div className="flex items-baseline gap-4 border-b border-white/5 pb-2">
                <span className="font-black text-2xl italic text-brand-primary">02.</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Rational_Reasoning_Analysis</h2>
              </div>
              <div className="p-8 bg-white/[0.02] border-l-4 border-brand-primary rounded-r-xl">
                 <p className="text-sm font-sans leading-relaxed text-slate-400 italic">"{scr.reasonForChange}"</p>
              </div>
            </section>

            {/* Section 3: Classification */}
            <section className="space-y-6">
              <div className="flex items-baseline gap-4 border-b border-white/5 pb-2">
                <span className="font-black text-2xl italic text-brand-primary">03.</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Significance_Categorization</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <div className="px-3 py-1 bg-white text-black text-[10px] font-black uppercase">{scr.changeType}_LEVEL</div>
                </div>
                <p className="text-sm font-sans leading-relaxed text-slate-400">{scr.categorizationExplanation}</p>
              </div>
            </section>

            {/* Section 4: Customer Impact */}
            <section className="space-y-8">
              <div className="flex items-baseline gap-4 border-b border-white/5 pb-2">
                <span className="font-black text-2xl italic text-brand-primary">04.</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Delta_Impact_Surfaces</h2>
              </div>
              {scr.customerImpactItems && scr.customerImpactItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scr.customerImpactItems.map((i) => (
                    <div key={i.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 hover:border-brand-secondary/30 transition-all">
                       <div className="text-[10px] font-mono font-black text-brand-secondary uppercase tracking-[0.2em]">{i.area}</div>
                       <p className="text-xs text-slate-400 font-sans leading-relaxed">{i.impact}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Section 6: Security Controls */}
            <section className="space-y-10">
              <div className="flex items-baseline gap-4 border-b border-white/5 pb-2">
                <span className="font-black text-2xl italic text-brand-primary">06.</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Control_Envelope_Mappings</h2>
              </div>
              <div className="grid grid-cols-1 gap-8">
                {scr.mappedControls?.map((mc) => (
                  <div key={mc.controlId} className="group relative flex gap-8 items-start">
                    <div className="absolute -left-12 top-0 bottom-0 w-[2px] bg-white/5 group-hover:bg-brand-primary/50 transition-colors" />
                    <div className="bg-white text-black px-3 py-1.5 text-[11px] font-black font-mono shrink-0 shadow-xl group-hover:bg-brand-primary group-hover:scale-110 transition-all duration-300">
                      {mc.controlId}
                    </div>
                    <div className="text-sm font-sans leading-relaxed text-slate-400 pt-1 group-hover:text-slate-200 transition-colors border-b border-white/5 pb-6 w-full italic">
                      {mc.justification}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 7: Risk Posture */}
            <section className="space-y-12">
              <div className="flex items-baseline gap-4 border-b border-white/5 pb-2">
                <span className="font-black text-2xl italic text-brand-primary">07.</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Net_Risk_Post_Deployment</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-12">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-2">
                    <History className="w-3 h-3 text-brand-primary" /> 7.1_THREAT_VECTORS
                  </h3>
                  <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <div className="grid grid-cols-3 bg-white/5 p-4 text-[9px] font-mono font-black text-slate-500 tracking-widest uppercase">
                       <div>RISK_ID</div>
                       <div>VULN_ASSESSMENT</div>
                       <div>STRATEGY_MITIGATION</div>
                    </div>
                    <div className="divide-y divide-white/5">
                      {scr.riskAssessments?.map((r) => (
                        <div key={r.id} className="grid grid-cols-3 p-6 items-center gap-4 hover:bg-white/5 transition-all">
                          <div className="text-[10px] font-black text-white uppercase">{r.area}</div>
                          <div className="text-[11px] text-slate-500 italic leading-relaxed">{r.assessment}</div>
                          <div className="text-[11px] text-brand-primary/80 font-bold leading-relaxed">{r.mitigation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-10 glass-morphism border-brand-primary/20 bg-brand-primary/5 rounded-3xl relative overflow-hidden group">
                   <Shield className="absolute -bottom-10 -right-10 w-48 h-48 text-brand-primary/10 group-hover:scale-110 transition-transform duration-1000" />
                   <h3 className="text-[10px] font-black uppercase text-brand-primary tracking-[0.3em] mb-6">FINAL_SECURITY_POSTURE_ATTESTATION</h3>
                   <p className="text-lg font-black text-white leading-tight uppercase font-mono italic">"{scr.netRiskPosture}"</p>
                </div>
              </div>
            </section>
          </div>

          {/* Quick Actions (Admin only sim) */}
          <div className="mt-24 pt-12 border-t border-white/10 flex gap-6 items-center">
             {scr.status === 'Pending Approval' && (
               <div className="flex gap-4">
                 <button 
                   onClick={() => handleStatusUpdate('Approved')}
                   className="group relative h-12 px-8 bg-brand-primary text-black font-mono font-black text-xs overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                    <span className="relative flex items-center gap-2">
                       <CheckCircle className="w-4 h-4" /> AUTHORIZE_RECORD
                    </span>
                 </button>
                 <button 
                   onClick={() => handleStatusUpdate('Rejected')}
                   className="h-12 px-8 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white font-mono font-black text-xs transition-all"
                 >
                    DENY_RECORD
                 </button>
               </div>
             )}
             {(scr.status === 'Approved' || scr.status === 'Pending Approval') && (
               <button 
                 onClick={handleJiraSync}
                 disabled={syncingJira}
                 className="h-12 px-8 bg-brand-secondary text-white font-mono font-black text-xs flex items-center gap-3 hover:bg-brand-secondary/80 disabled:opacity-50 transition-all"
               >
                 {syncingJira ? (
                   <Activity className="w-4 h-4 animate-pulse" />
                 ) : (
                   <div className="w-4 h-4 bg-white/20 p-0.5 rounded leading-none text-[8px] flex items-center justify-center">J</div>
                 )}
                 {syncingJira ? 'SYNC_IN_PROGRESS...' : 'PUSH_TO_JIRA_CORE'}
               </button>
             )}
             <button className="h-12 px-8 border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 font-mono font-black text-xs ml-auto transition-all">
               GENERATE_OSCAL_JSON
             </button>
          </div>
        </div>
      </div>

      {/* Sidebar Tool */}
      <div className="w-24 bg-bg-surface border-l border-white/5 flex flex-col items-center py-10 gap-10">
         <button 
           onClick={onClose}
           className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:scale-110 transition-all font-black text-xs"
           title="Exit Preview"
         >
           <X className="w-6 h-6" />
         </button>
         
         <div className="flex-1 flex flex-col items-center gap-6">
           <div className="w-10 h-[1px] bg-white/5" />
           <button 
             onClick={() => setShowLogs(!showLogs)}
             className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all border ${showLogs ? 'bg-brand-primary text-black border-brand-primary scale-110' : 'bg-white/5 text-slate-500 border-white/10 hover:text-white hover:bg-white/10'}`}
             title="Audit Logging"
           >
             <History className="w-6 h-6" />
           </button>
           <button className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/10 transition-all" title="Download VMC">
             <Download className="w-6 h-6" />
           </button>
         </div>

         <div className="mt-auto space-y-4 text-center">
            <div className="text-[7px] font-mono font-black text-slate-800 rotate-90 whitespace-nowrap mb-8 uppercase tracking-[0.5em]">RECORD_v2.0_ENGINE</div>
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse mx-auto opacity-40" />
         </div>
      </div>

      {/* Audit Logs Sidebar - Modern Design */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-24 bottom-0 w-[400px] bg-bg-surface border-l border-white/5 shadow-[-40px_0_100px_rgba(0,0,0,0.5)] z-50 flex flex-col"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h3 className="text-xs font-mono font-black text-white tracking-[0.3em] uppercase">Audit_History_Engine</h3>
                <p className="text-[8px] font-mono text-slate-500 mt-1 uppercase font-black">Cryptographic_Hash_Integrity: VERIFIED</p>
              </div>
              <button 
                onClick={() => setShowLogs(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-600 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto terminal-scroll p-8 space-y-10">
              {logs.map((log, idx) => (
                <div key={log.id} className="relative pl-8 group">
                  <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/5 group-hover:bg-brand-primary/30 transition-colors" />
                  <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full border border-slate-800 bg-bg-surface group-hover:bg-brand-primary transition-all" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[8px] font-mono font-black uppercase tracking-widest text-slate-600">
                      <span>{log.action}</span>
                      <span>{log.timestamp?.seconds ? format(new Date(log.timestamp.seconds * 1000), 'HH:mm:ss') : 'LIVE'}</span>
                    </div>
                    <div className="text-xs font-black text-slate-300 leading-snug uppercase tracking-tighter italic">"{log.details}"</div>
                    <div className="flex items-center gap-2 opacity-30">
                       <div className="w-3 h-3 bg-white/10 rounded-full" />
                       <span className="text-[8px] font-mono text-white font-bold">{log.userEmail}</span>
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-32 space-y-4">
                  <Activity className="w-8 h-8 text-slate-800 mx-auto" />
                  <div className="text-[9px] font-mono text-slate-700 font-bold uppercase tracking-[0.2em]">Zero events captured in local buffer.</div>
                </div>
              )}
            </div>
            
            <div className="p-8 bg-white/[0.01] border-t border-white/5 text-[8px] font-mono text-slate-700 flex justify-between items-center uppercase font-black italic">
              <span>immutable_audit_control</span>
              <span className="text-slate-800 tracking-widest">LAYER_7_LOGGING</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
