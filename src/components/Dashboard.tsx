import React, { useState, useMemo } from 'react';
import { Plus, FileText, Activity, AlertCircle, Clock, CheckCircle, Filter, Search, X, Shield, Key } from 'lucide-react';
import { SCR, SCRStatus, ChangeType } from '../types';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { motion } from 'motion/react';

interface DashboardProps {
  scrs: SCR[];
  onCreateNew: () => void;
  onSelectSCR: (scr: SCR) => void;
  onViewConMon: () => void;
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-800 border-gray-400',
  'Pending Assessment': 'bg-blue-100 text-blue-800 border-blue-400',
  'Pending Approval': 'bg-amber-100 text-amber-800 border-amber-400',
  'Approved': 'bg-emerald-100 text-emerald-800 border-emerald-400',
  'Rejected': 'bg-rose-100 text-rose-800 border-rose-400',
};

export default function Dashboard({ scrs, onCreateNew, onSelectSCR, onViewConMon }: DashboardProps) {
  const [filterStatus, setFilterStatus] = useState<SCRStatus | 'All'>('All');
  const [filterType, setFilterType] = useState<ChangeType | 'All'>('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredScrs = useMemo(() => {
    return scrs.filter(scr => {
      const matchesStatus = filterStatus === 'All' || scr.status === filterStatus;
      const matchesType = filterType === 'All' || scr.changeType === filterType;
      const matchesSearch = scr.fedrampId.toLowerCase().includes(search.toLowerCase()) || 
                           scr.shortDescription.toLowerCase().includes(search.toLowerCase());
      
      let matchesDate = true;
      if (scr.updatedAt?.seconds) {
        const updatedAt = new Date(scr.updatedAt.seconds * 1000);
        if (dateFrom) {
          matchesDate = matchesDate && isAfter(updatedAt, startOfDay(new Date(dateFrom)));
        }
        if (dateTo) {
          matchesDate = matchesDate && isBefore(updatedAt, endOfDay(new Date(dateTo)));
        }
      } else if (dateFrom || dateTo) {
        matchesDate = false;
      }

      return matchesStatus && matchesType && matchesSearch && matchesDate;
    });
  }, [scrs, filterStatus, filterType, search, dateFrom, dateTo]);

  const clearFilters = () => {
    setFilterStatus('All');
    setFilterType('All');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="max-w-7xl mx-auto p-10 space-y-12">
      {/* Dashboard Top Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary/10 rounded-lg border border-brand-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Shield className="w-6 h-6 text-brand-primary" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">Sig Change Scout</h1>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-mono tracking-[0.4em] text-slate-500 flex items-center gap-2 uppercase">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              Secure_Compliance_Inference_Engine_v4.2
            </p>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2 px-2 py-0.5 bg-white/5 border border-white/5 rounded">
              <span className="text-[9px] font-mono text-slate-500 font-bold">TOTAL_RECORDS:</span>
              <span className="text-[9px] font-mono text-white font-black">{scrs.length}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onCreateNew}
          className="group relative h-12 px-8 bg-white text-black font-mono font-black text-xs transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-brand-primary transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
            <Plus className="w-4 h-4" /> INITIALIZE_NEW_CHANGE_REQUEST
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-morphism p-8 flex flex-col gap-6 relative group hover:border-brand-secondary/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-ping" />
          </div>
          <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-4 h-[1px] bg-slate-800" /> DRAFT_RECORDS
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-6xl font-black tracking-tighter text-white">
              {scrs.filter(s => s.status === 'Draft').length}
            </span>
            <FileText className="w-8 h-8 text-slate-800 group-hover:text-brand-secondary group-hover:scale-110 transition-all" />
          </div>
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
               <div className="h-full bg-brand-secondary shadow-[0_0_10px_rgba(14,165,233,0.5)]" style={{ width: `${(scrs.filter(s => s.status === 'Draft').length / Math.max(1, scrs.length)) * 100}%` }} />
            </div>
            <div className="text-[9px] font-mono text-slate-500 font-bold tracking-widest uppercase">STAGING_STATUS: INITIAL_CAPTURE</div>
          </div>
        </div>

        <div className="glass-morphism p-8 flex flex-col gap-6 relative group hover:border-amber-500/30 transition-all duration-300">
          <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-4 h-[1px] bg-slate-800" /> AWAITING_ASSESSMENT
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-6xl font-black tracking-tighter text-amber-500">
              {scrs.filter(s => s.status === 'Pending Assessment').length}
            </span>
            <Shield className="w-8 h-8 text-slate-800 group-hover:text-amber-500 group-hover:scale-110 transition-all" />
          </div>
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
               <div className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${(scrs.filter(s => s.status === 'Pending Assessment').length / Math.max(1, scrs.length)) * 100}%` }} />
            </div>
            <div className="text-[9px] font-mono text-slate-500 font-bold tracking-widest uppercase">AUDIT_PIPELINE: ACTIVE_WAIT</div>
          </div>
        </div>

        <div className="glass-morphism p-8 flex flex-col gap-6 relative group hover:border-brand-primary/30 transition-all duration-300">
          <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-4 h-[1px] bg-slate-800" /> VERIFIED_SET
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-6xl font-black tracking-tighter text-brand-primary">
              {scrs.filter(s => s.status === 'Approved').length}
            </span>
            <CheckCircle className="w-8 h-8 text-slate-800 group-hover:text-brand-primary group-hover:scale-110 transition-all" />
          </div>
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
               <div className="h-full bg-brand-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(scrs.filter(s => s.status === 'Approved').length / Math.max(1, scrs.length)) * 100}%` }} />
            </div>
            <div className="text-[9px] font-mono text-slate-500 font-bold tracking-widest uppercase">PROVENANCE_SECURED</div>
          </div>
        </div>

        <div className="glass-morphism p-8 flex flex-col gap-6 relative group hover:border-brand-primary/30 transition-all duration-300">
          <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-4 h-[1px] bg-slate-800" /> VAULT_HEALTH
          </span>
          <div className="flex items-baseline justify-between transition-transform group-hover:scale-105">
            <span className="text-6xl font-black tracking-tighter text-white uppercase italic">
              {scrs.reduce((acc, s) => acc + (s.secretsInventory?.length || 0), 0)}
            </span>
            <Key className="w-8 h-8 text-slate-800 group-hover:text-brand-primary transition-all duration-500 group-hover:rotate-12" />
          </div>
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex justify-between items-center text-[9px] font-mono">
               <span className="text-slate-600 font-bold uppercase tracking-widest">Active_Keys</span>
               <span className="text-brand-primary font-black uppercase tracking-tighter shadow-sm shadow-brand-primary/20">Verified</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onViewConMon} 
          className="glass-morphism p-6 flex flex-col items-center justify-center gap-4 text-center group hover:bg-brand-primary/10 transition-all border-brand-primary/10"
        >
            <div className="w-12 h-12 rounded-xl bg-bg-surface border border-white/10 flex items-center justify-center text-brand-primary shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
               <Activity className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-black text-white block tracking-widest">CONTINUOUS_MONITORING</span>
              <p className="text-[8px] font-mono text-slate-500 leading-tight uppercase font-bold">Inspect all routine infrastructure syscalls & drifts.</p>
            </div>
        </button>
      </div>

      {/* Submission Chart Section */}
      <div className="glass-morphism p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
           <div className="w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5 relative z-10">
          <div className="space-y-1">
            <h2 className="text-[11px] font-mono font-black text-white hover:text-brand-primary transition-colors flex items-center gap-3 tracking-[0.3em] uppercase">
              <Activity className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
              Ingestion_Signal_Metastream
            </h2>
            <div className="text-[8px] font-mono text-slate-700 tracking-widest font-black uppercase">Sampling_Rate: 1.4Hz | Buffer: Active</div>
          </div>
          <div className="flex gap-8 text-[9px] font-mono font-black uppercase tracking-[0.2em] text-slate-600">
             <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-brand-secondary rounded-sm shadow-[0_0_12px_rgba(14,165,233,0.3)] transition-all hover:scale-110" /> 
                <span className="hover:text-brand-secondary transition-colors">Nominal_Flux</span>
             </div>
             <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-all hover:scale-110" /> 
                <span className="hover:text-rose-500 transition-colors">Drift_Detected</span>
             </div>
          </div>
        </div>
        <div className="h-40 flex items-end gap-1 px-4 relative z-10">
           {[40, 45, 42, 48, 55, 52, 45, 40, 38, 42, 45, 50, 48, 42, 40, 45, 60, 45, 42, 40, 38, 42, 40, 35, 38, 42, 45, 40, 65, 35, 40, 42, 48, 50, 45].map((h, i) => (
             <motion.div 
               key={i} 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: `${h}%`, opacity: 1 }}
               transition={{ delay: i * 0.015, duration: 0.4, ease: "easeOut" }}
               className={`flex-1 ${i === 16 || i === 28 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-slate-800 hover:bg-brand-secondary hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]'} transition-all cursor-crosshair relative group rounded-t-[1px]`}
             >
               <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black px-2.5 py-1.5 rounded text-[9px] font-mono font-black opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 whitespace-nowrap border-b-2 border-brand-primary">
                  {i === 16 || i === 28 ? 'CRITICAL_DRIFT' : `V_${h}.042`}
               </div>
               <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
             </motion.div>
           ))}
        </div>
        <div className="mt-6 flex justify-between text-[8px] font-mono text-slate-700 font-black tracking-widest px-4 border-t border-white/5 pt-4 uppercase">
           <span>BATCH_2026/05/04</span>
           <span>BATCH_2026/05/14</span>
           <span>BATCH_2026/05/24</span>
           <span>BATCH_2026/06/03</span>
        </div>
      </div>

      {/* List / Queue View */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="h-8 w-1 bg-brand-primary" />
             <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Change Request Queue</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="SEARCH_BY_REF_ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white/5 border border-white/10 px-10 py-2.5 rounded text-[10px] font-mono font-black text-white w-64 placeholder:text-slate-700 focus:outline-none focus:border-brand-primary/50 transition-all uppercase"
                />
             </div>
             <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded border border-white/5">
                {['All', 'Draft', 'Pending Assessment', 'Approved'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as any)}
                    className={`px-3 py-1.5 rounded text-[9px] font-mono font-black uppercase transition-all ${filterStatus === status ? 'bg-white text-black' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    {status === 'All' ? 'ANY' : status.split(' ')[0]}
                  </button>
                ))}
             </div>
          </div>
        </div>

        <div className="glass-morphism overflow-hidden">
          {/* Custom Header */}
          <div className="grid grid-cols-12 gap-6 px-10 py-6 border-b border-white/10 bg-white/5 uppercase font-mono text-[10px] font-black tracking-[0.2em] text-slate-500">
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full border border-slate-700 shrink-0" />
              IDENTIFIER
            </div>
            <div className="col-span-5">OBJECTIVE_SPECIFICATION</div>
            <div className="col-span-2">CLASSIFICATION</div>
            <div className="col-span-2 text-center">OPERATIONAL_STATE</div>
            <div className="col-span-1 text-right">LATEST_DELTA</div>
          </div>

          <div className="divide-y divide-white/5 terminal-scroll max-h-[700px] overflow-y-auto">
            {filteredScrs.length === 0 ? (
              <div className="p-32 text-center space-y-6">
                 <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center text-slate-800">
                       <Search className="w-10 h-10" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="text-2xl font-black text-slate-700 italic uppercase tracking-tighter">Zero Records Found</div>
                    <p className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">No compliance signal detected on current filtered frequency.</p>
                 </div>
                 <button onClick={clearFilters} className="text-[10px] font-mono font-black text-brand-primary hover:underline uppercase tracking-widest">
                    RESET_ALL_SENSORS
                 </button>
              </div>
            ) : (
              filteredScrs.map((scr) => (
                <motion.div 
                  layout
                  key={scr.id}
                  onClick={() => onSelectSCR(scr)}
                  className="grid grid-cols-12 gap-6 px-10 py-8 items-center hover:bg-white/[0.03] transition-all cursor-pointer group relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                  <div className="col-span-2">
                    <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${scr.status === 'Approved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : scr.status === 'Draft' ? 'bg-slate-700' : 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                       <span className="text-white font-black font-mono text-sm tracking-tighter group-hover:text-brand-primary transition-colors">#{scr.fedrampId}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 mt-1 font-bold uppercase tracking-widest pl-5">{scr.scnReference || 'REF_NULL'}</div>
                  </div>
                  <div className="col-span-5">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors uppercase leading-relaxed tracking-tight line-clamp-2">{scr.shortDescription}</div>
                    {scr.jiraTicketId && (
                       <div className="text-[9px] font-mono text-brand-secondary mt-1 flex items-center gap-1 opacity-70">
                          <Activity className="w-2.5 h-2.5" /> {scr.jiraTicketId}
                       </div>
                    )}
                  </div>
                  <div className="col-span-2">
                     <div className={`text-[10px] font-mono font-black px-3 py-1.5 border rounded-md inline-block uppercase tracking-widest ${
                       scr.changeType === 'Transformative' ? 'border-rose-500/20 text-rose-500 bg-rose-500/5' : 
                       scr.changeType === 'Adaptive' ? 'border-brand-secondary/20 text-brand-secondary bg-brand-secondary/5' : 
                       'border-slate-800 text-slate-600'
                     }`}>
                       {scr.changeType}
                     </div>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <div className={`text-[10px] font-mono font-black flex items-center gap-3 px-4 py-2 rounded-lg uppercase tracking-widest border border-transparent shadow-2xl transition-all group-hover:border-white/5 ${
                      scr.status === 'Approved' ? 'bg-emerald-500/5 text-emerald-500' : 
                      scr.status === 'Draft' ? 'bg-slate-900 text-slate-500' : 
                      'bg-amber-500/5 text-amber-500'
                    }`}>
                      {scr.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5" />}
                      {scr.status === 'Draft' && <Clock className="w-3.5 h-3.5" />}
                      {scr.status.includes('Pending') && <Activity className="w-3.5 h-3.5 animate-pulse" />}
                      {scr.status}
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    <div className="font-mono text-[10px] text-white font-black tracking-tighter">
                      {scr.updatedAt?.seconds ? format(new Date(scr.updatedAt.seconds * 1000), 'HH:mm:ss') : 'INIT'}
                    </div>
                    <div className="text-[8px] font-mono text-slate-700 font-bold tracking-widest uppercase mt-0.5">
                      {scr.updatedAt?.seconds ? format(new Date(scr.updatedAt.seconds * 1000), 'yyyy/MM/dd') : 'STAGED'}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
