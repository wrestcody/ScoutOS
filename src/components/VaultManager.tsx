import React, { useState } from 'react';
import { Shield, Key, RefreshCw, AlertTriangle, CheckCircle, ExternalLink, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { SecretItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface VaultManagerProps {
  secrets: SecretItem[];
  onUpdate: (secrets: SecretItem[]) => void;
}

const VaultManager: React.FC<VaultManagerProps> = ({ secrets, onUpdate }) => {
  const [checking, setChecking] = useState<string | null>(null);

  const addSecret = () => {
    const newSecret: SecretItem = {
      id: crypto.randomUUID(),
      keyName: '',
      provider: 'AWS_Secrets_Manager',
      providerRef: '',
      status: 'UNCHECKED'
    };
    onUpdate([...secrets, newSecret]);
  };

  const removeSecret = (id: string) => {
    onUpdate(secrets.filter(s => s.id !== id));
  };

  const updateSecret = (id: string, updates: Partial<SecretItem>) => {
    onUpdate(secrets.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const verifySecret = async (id: string) => {
    const secret = secrets.find(s => s.id === id);
    if (!secret) return;

    setChecking(id);
    try {
      const response = await fetch('/api/vault/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: secret.provider, providerRef: secret.providerRef })
      });
      const data = await response.json();
      
      updateSecret(id, { 
        status: data.status, 
        lastChecked: { seconds: Math.floor(Date.now() / 1000) } 
      });
    } catch (error) {
      console.error("Vault verification failed:", error);
    } finally {
      setChecking(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-brand-primary/5 p-10 border-2 border-brand-primary/20 rounded-3xl relative overflow-hidden group">
        <Key className="absolute -bottom-10 -right-10 w-48 h-48 text-brand-primary/10 group-hover:rotate-12 transition-transform duration-1000" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-brand-primary flex items-center justify-center rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="w-10 h-10 text-black" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">VAULT_INTEGRATION_SUITE</h4>
            <p className="text-[10px] text-brand-primary font-mono font-black italic tracking-[0.2em] uppercase">SECURE_CREDENTIAL_ORCHESTRATION_&_ROTATION</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="font-mono text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">ACTIVE_SECRET_INVENTORY</h3>
        <button 
          onClick={addSecret}
          className="h-9 px-6 bg-white/5 border border-white/10 text-[10px] font-mono font-black text-white hover:bg-brand-primary hover:text-black transition-all rounded-sm uppercase tracking-widest"
        >
          GENERATE_SECRET_REFERENCE
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {secrets.length === 0 && (
          <div className="py-24 border-2 border-dashed border-white/5 rounded-3xl text-center flex flex-col items-center gap-4">
            <Shield className="w-12 h-12 text-slate-900" />
            <div className="text-[10px] font-mono text-slate-700 font-black uppercase tracking-[0.4em]">NO_SECRETS_IDENTIFIED_IN_BOUNDARY</div>
          </div>
        )}

        {secrets.map((secret) => (
          <motion.div 
            key={secret.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.01] border border-white/5 p-8 rounded-2xl group hover:border-brand-primary/30 transition-all relative overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
              <div className="md:col-span-3 space-y-2">
                <label className="text-[8px] font-mono text-slate-700 uppercase font-black tracking-widest">KEY_IDENTIFIER</label>
                <input 
                  value={secret.keyName}
                  onChange={(e) => updateSecret(secret.id, { keyName: e.target.value })}
                  placeholder="DB_ROOT_AURORA..."
                  className="w-full h-11 px-4 bg-bg-deep border border-white/10 text-white font-black text-[11px] outline-none rounded"
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-[8px] font-mono text-slate-700 uppercase font-black tracking-widest">PROVIDER_GATEWAY</label>
                <select
                  value={secret.provider}
                  onChange={(e) => updateSecret(secret.id, { provider: e.target.value as any })}
                  className="w-full h-11 px-4 bg-bg-deep border border-white/10 text-slate-400 font-black text-[11px] outline-none rounded appearance-none"
                >
                  <option value="AWS_Secrets_Manager">AWS_Secrets_Manager</option>
                  <option value="HashiCorp_Vault">HashiCorp_Vault</option>
                  <option value="Azure_Key_Vault">Azure_Key_Vault</option>
                  <option value="Internal">Internal_Management</option>
                </select>
              </div>

              <div className="md:col-span-4 space-y-2">
                <label className="text-[8px] font-mono text-slate-700 uppercase font-black tracking-widest">PROVIDER_RESOURCE_ARN / REF</label>
                <input 
                  value={secret.providerRef}
                  onChange={(e) => updateSecret(secret.id, { providerRef: e.target.value })}
                  placeholder="arn:aws:secretsmanager:..."
                  className="w-full h-11 px-4 bg-bg-deep border border-white/10 text-brand-secondary font-mono text-[10px] outline-none rounded"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <button 
                  onClick={() => verifySecret(secret.id)}
                  disabled={checking === secret.id}
                  className={`h-11 flex-1 flex items-center justify-center rounded transition-all ${
                    secret.status === 'VERIFIED' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30' : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/30'
                  }`}
                >
                  {checking === secret.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                   secret.status === 'VERIFIED' ? <CheckCircle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => removeSecret(secret.id)}
                  className="h-11 w-11 flex items-center justify-center bg-rose-500/5 text-slate-700 hover:text-rose-500 border border-transparent hover:border-rose-500/30 rounded transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {secret.status === 'VERIFIED' && (
              <div className="mt-4 flex items-center gap-2 text-[9px] font-mono text-brand-primary/60 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                VERIFICATION_SYNC_SUCCESSFUL_TIMESTAMP: {secret.lastChecked && new Date(secret.lastChecked.seconds * 1000).toLocaleString()}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="p-8 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex gap-6 items-center">
        <div className="p-3 bg-amber-500/20 rounded-xl">
           <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>
        <div className="space-y-1">
           <div className="text-[11px] font-black text-amber-500 uppercase tracking-widest">CRITICAL_ADVISORY: SECRET_ROTATION_IA-5(7)</div>
           <p className="text-[9px] font-mono text-slate-500 font-bold uppercase leading-relaxed italic">
             FedRAMP High/Moderate systems mandate cryptographic key rotation. Ensure external vault policies align with the 90-day rotation boundary defined in Section 1.
           </p>
        </div>
      </div>
    </div>
  );
};

export default VaultManager;
