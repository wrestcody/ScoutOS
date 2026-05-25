import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, db, handleFirestoreError, OperationType } from './services/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { Layout, Plus, FileText, CheckCircle, Shield, History, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SCR, AuditLog } from './types';
import Dashboard from './components/Dashboard';
import SCREditor from './components/SCREditor';
import SCRDetail from './components/SCRDetail';
import ConMonDashboard from './components/ConMonDashboard';
import { seedAuditLogs, seedSCRs } from './services/seedService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'conmon'>('list');
  const [selectedSCR, setSelectedSCR] = useState<SCR | null>(null);
  const [scrs, setScrs] = useState<SCR[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        seedAuditLogs(u);
        seedSCRs(u);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setScrs([]);
      return;
    }

    const q = query(
      collection(db, 'scrs'), 
      where('creatorId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SCR));
      setScrs(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'scrs');
    });

    return unsubscribe;
  }, [user]);

  const handleCreateNew = () => {
    setSelectedSCR(null);
    setView('create');
  };

  const handleSelectSCR = (scr: SCR) => {
    setSelectedSCR(scr);
    setView('detail');
  };

  const handleCloseView = () => {
    setView('list');
    setSelectedSCR(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center font-mono technical-grid">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1, 0.98] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-brand-primary flex flex-col items-center gap-4"
        >
          <div className="w-16 h-1 bg-slate-800 relative overflow-hidden">
            <motion.div 
              animate={{ x: [-64, 64] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 bg-brand-primary"
            />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em]">INITIALIZING_COMPLIANCE_CORE</span>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center p-4 technical-grid">
        <div className="max-w-md w-full glass-morphism p-10 space-y-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2">
            <span className="text-[8px] font-mono text-white/20 uppercase font-black">auth_layer_v5.2</span>
          </div>
          <div className="absolute -top-24 -right-24 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700">
             <Shield className="w-64 h-64 text-brand-primary" />
          </div>
          <div className="text-center space-y-6 relative z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-brand-primary/10 rounded-2xl border border-brand-primary/20">
                <Shield className="w-12 h-12 text-brand-primary" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">Sig Change Scout</h1>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono font-bold text-brand-secondary uppercase tracking-[0.3em] bg-white/5 py-1.5 px-4 inline-block rounded-full border border-white/10">Deterministic_Compliance</p>
              <p className="text-xs font-mono text-slate-400 leading-relaxed uppercase max-w-[280px] mx-auto">Authorized personnel only. Access leads to persistent audit logging.</p>
            </div>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full group relative flex items-center justify-center gap-3 bg-white text-black py-4 font-mono font-black text-sm transition-all hover:bg-brand-primary hover:text-white"
          >
            <div className="absolute inset-0 border-2 border-white group-hover:scale-105 group-hover:opacity-0 transition-all duration-300" />
            INITIALIZE_CREDENTIALS
          </button>
          <div className="p-4 bg-white/5 border border-white/5 text-[9px] text-slate-500 font-mono leading-relaxed uppercase tracking-widest text-center">
            FedRAMP Authorization Boundary Protection Active
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col font-sans text-slate-300 antialiased selection:bg-brand-primary/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-bg-deep/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('list')}>
              <div className="p-2 bg-brand-primary/10 rounded-lg border border-brand-primary/20 group-hover:bg-brand-primary/20 transition-all">
                <Shield className="w-5 h-5 text-brand-primary" />
              </div>
              <span className="font-black tracking-tighter text-2xl text-white">SIG CHANGE SCOUT</span>
            </div>
            <nav className="hidden lg:flex gap-8 text-[10px] font-mono font-black tracking-widest">
              <button 
                onClick={() => setView('list')}
                className={`hover:text-brand-primary transition-all py-2 border-b-2 ${view === 'list' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500'}`}
              >
                SUMMARY
              </button>
              <button 
                onClick={() => setView('conmon')}
                className={`hover:text-brand-primary transition-all py-2 border-b-2 ${view === 'conmon' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500'}`}
              >
                LIVELOG_TRAIL
              </button>
              <button className="text-slate-800 transition-all py-2 border-b-2 border-transparent cursor-not-allowed">NODES</button>
              <button className="text-slate-800 transition-all py-2 border-b-2 border-transparent cursor-not-allowed">POLICIES</button>
            </nav>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden xl:flex items-center gap-3 px-4 py-1.5 bg-brand-primary/5 border border-brand-primary/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />
              <span className="text-[9px] font-mono font-black text-brand-primary tracking-widest">REALTIME_INGESTION_SYSCALL: OK</span>
            </div>
            
            <div className="flex items-center gap-4 border-l border-white/10 pl-8">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-mono font-black text-white leading-none tracking-tight">{user.displayName?.toUpperCase()}</div>
                <div className="text-[9px] font-mono text-slate-500 leading-none mt-1 uppercase tracking-tighter opacity-60 font-bold">{user.email}</div>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden technical-grid">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="h-full overflow-y-auto terminal-scroll"
            >
              <Dashboard 
                scrs={scrs} 
                onCreateNew={handleCreateNew} 
                onSelectSCR={handleSelectSCR}
                onViewConMon={() => setView('conmon')}
              />
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="h-full overflow-y-auto bg-bg-surface terminal-scroll"
            >
              <SCREditor 
                user={user} 
                onClose={handleCloseView}
                onSave={(scr) => {
                  setView('list');
                }}
              />
            </motion.div>
          )}

          {view === 'detail' && selectedSCR && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="h-full overflow-y-auto bg-bg-surface terminal-scroll"
            >
              <SCRDetail 
                scr={selectedSCR} 
                onClose={handleCloseView}
                user={user}
              />
            </motion.div>
          )}

          {view === 'conmon' && (
            <motion.div
              key="conmon"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              className="h-full overflow-hidden"
            >
              <ConMonDashboard 
                onBack={handleCloseView} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Status Bar */}
      <footer className="h-10 border-t border-white/5 bg-bg-deep flex items-center px-6 justify-between text-[9px] font-mono text-slate-600 uppercase font-black tracking-widest">
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full" />
            <span className="text-brand-primary/60">NODE_HEALTH: EXCELLENT</span>
          </div>
          <span className="opacity-20">|</span>
          <span>SYSTEM: FEDRAMP_SPECIAL_EDITION</span>
          <span className="opacity-20">|</span>
          <span>LATENCY: 14MS</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 bg-white/5 border border-white/5 rounded">UTC_{new Date().toISOString().replace('T', '_').substr(0, 19)}</div>
        </div>
      </footer>
    </div>
  );
}
