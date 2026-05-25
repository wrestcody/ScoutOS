import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, Timestamp, limit } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import { AuditLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  Calendar, 
  Filter, 
  Activity, 
  ShieldAlert, 
  Info, 
  AlertTriangle,
  Clock,
  ArrowLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface ConMonDashboardProps {
  onBack: () => void;
}

export default function ConMonDashboard({ onBack }: ConMonDashboardProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD

  useEffect(() => {
    if (!auth.currentUser) return;

    const logsRef = collection(db, 'audit_logs');
    // Rule requires filtering by userId for the list operation to satisfy 'No Blanket Reads'
    let q = query(
      logsRef, 
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'), 
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      setLogs(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'ALL' || log.category === filterCategory;
    
    let matchesDate = true;
    if (dateFilter) {
      const logDate = log.timestamp?.toDate()?.toISOString()?.split('T')[0];
      matchesDate = logDate === dateFilter;
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL': return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ROUTINE_PATCH': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'SCR_EDIT': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SYSTEM_EVENT': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'OSCAL_VALIDATION': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F3]">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">CONMON_AUDIT_TRAIL</h1>
            <p className="text-[10px] font-mono text-slate-400 opacity-80 uppercase tracking-widest">Deterministic Logging Verifier v2.0</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-green-400">PIPELINE_SYNCHRONIZED</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 bg-white border-r border-[#141414]/10 p-6 space-y-8 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Filters</h3>
            
            <div className="space-y-2">
              <label className="text-[9px] font-mono font-bold text-gray-500 uppercase">Search Records</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input 
                  type="text"
                  placeholder="ID, Action, User..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-mono font-bold text-gray-500 uppercase">Category</label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors appearance-none"
              >
                <option value="ALL">ALL_CATEGORIES</option>
                <option value="SCR_EDIT">SCR_EDITS</option>
                <option value="ROUTINE_PATCH">ROUTINE_PATCHES</option>
                <option value="SYSTEM_EVENT">SYSTEM_EVENTS</option>
                <option value="OSCAL_VALIDATION">OSCAL_VALIDATIONS</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-mono font-bold text-gray-500 uppercase">Date Range</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input 
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {dateFilter && (
                <button 
                  onClick={() => setDateFilter('')}
                  className="text-[9px] font-mono text-blue-600 hover:underline uppercase"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 space-y-4">
            <h3 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Health Metrics</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-mono font-bold text-gray-400">INGESTION_RATE</span>
                  <Activity className="w-3 h-3 text-green-500" />
                </div>
                <div className="text-lg font-bold tracking-tight">24.5<span className="text-xs text-gray-400 font-mono ml-1">EPS</span></div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-mono font-bold text-gray-400">CRITICAL_EVENTS</span>
                  <History className="w-3 h-3 text-red-500" />
                </div>
                <div className="text-lg font-bold tracking-tight">00<span className="text-xs text-gray-400 font-mono ml-1">24H</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Trail List */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-mono font-bold text-gray-500 tracking-widest uppercase">
                  Showing {filteredLogs.length} Records
                </span>
              </div>
              <button 
                onClick={() => window.print()}
                className="text-[10px] font-mono font-bold bg-white border-2 border-gray-900 px-3 py-1 hover:bg-gray-50 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase"
              >
                Export_Report
              </button>
            </div>

            {filteredLogs.length === 0 && !loading ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-white p-12 text-center">
                <History className="w-12 h-12 text-gray-200 mb-4" />
                <h3 className="font-bold text-gray-400 uppercase tracking-widest text-sm">No Audit Records Found</h3>
                <p className="text-xs text-gray-300 font-mono mt-1">Adjust your filters to scan more of the compliance stream.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log, idx) => (
                  <motion.div
                    key={log.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-default"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Left: Metadata */}
                      <div className="w-full sm:w-48 p-4 border-b sm:border-b-0 sm:border-r border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-[8px] font-black border uppercase tracking-tighter ${getCategoryColor(log.category)}`}>
                            {log.category.replace('_', ' ')}
                          </span>
                          {getSeverityIcon(log.severity)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-gray-900">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {log.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400 uppercase">
                            <Calendar className="w-3 h-3 text-gray-300" />
                            {log.timestamp?.toDate()?.toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Right: Content */}
                      <div className="flex-1 p-4 relative">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm tracking-tight text-gray-900 group-hover:text-blue-600 transition-colors uppercase italic mb-1">
                            {log.action}
                          </h4>
                          <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            #{log.id?.substr(0, 8).toUpperCase() || 'TEMP'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-mono leading-relaxed bg-gray-50 p-2 border border-gray-100 mb-3">
                          {log.details}
                        </p>
                        <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 uppercase font-bold">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[8px] text-gray-500">
                                {log.userEmail.charAt(0).toUpperCase()}
                            </div>
                            {log.userEmail}
                          </div>
                          {log.scrId && (
                            <div className="flex items-center gap-1 text-blue-500 hover:underline cursor-pointer">
                              SCR_REFERENCE <ChevronRight className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
