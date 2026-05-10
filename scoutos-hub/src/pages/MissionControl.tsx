import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

type LogEntry = {
    id: string;
    timestamp: string;
    level: 'INFO' | 'SIGNAL' | 'ARMOR_REDACTION' | 'CRITICAL_STALE';
    message: string;
}

function MissionControl() {
  const [logs, setLogs] = useState<LogEntry[]>([
      { id: '1', timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'System initialized. Armor Layer active.' }
  ]);

  useEffect(() => {
      // Simulate polling the nerve feed
      const interval = setInterval(() => {
          setLogs(prev => {
              const newLogs = [...prev];
              if (newLogs.length > 50) newLogs.shift();

              const levels: ('INFO' | 'SIGNAL' | 'ARMOR_REDACTION' | 'CRITICAL_STALE')[] = ['INFO', 'SIGNAL', 'ARMOR_REDACTION', 'CRITICAL_STALE'];
              const level = levels[Math.floor(Math.random() * levels.length)];

              let msg = "Polling operational data...";
              if (level === 'SIGNAL') msg = "Vanguard polling Genesys Cloud API...";
              if (level === 'ARMOR_REDACTION') msg = "Scrubbed PII from incoming payload.";
              if (level === 'CRITICAL_STALE') msg = "Sentinel triggered Deep Recall for JIRA-8992.";

              return [...newLogs, {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  level,
                  message: msg
              }];
          });
      }, 5000);

      return () => clearInterval(interval);
  }, []);

  const handleInitiateHLA = async (title: string, content: string) => {
      try {
          const res = await fetch('/api/skills/fulcrum/hla', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, content })
          });

          if (res.ok) {
              setLogs(prev => [...prev, {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  level: 'INFO',
                  message: `Initiated Confluence HLA for: ${title}`
              }]);
          } else {
             console.error("Failed to initiate HLA");
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleCommitToVault = async (type: string, title: string, content: string, crosswalk?: string[], cloudGuidance?: string) => {
      try {
          const res = await fetch('/api/skills/argus/commit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, title, content, crosswalk, cloudGuidance })
          });

          if (res.ok) {
              setLogs(prev => [...prev, {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  level: 'INFO',
                  message: `Committed ${type} to Obsidian Vault: ${title}`
              }]);
          } else {
             console.error("Failed to commit to vault");
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleCommand = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          const cmd = e.currentTarget.value.trim();
          e.currentTarget.value = '';

          if (cmd === '/sitrep') {
              setLogs(prev => [...prev, {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  level: 'INFO',
                  message: `Initiating Friday SITREP generation...`
              }]);

              try {
                  const res = await fetch('/api/skills/sitrep', { method: 'POST' });
                  const data = await res.json();
                  if (res.ok) {
                      setLogs(prev => [...prev, {
                          id: Math.random().toString(),
                          timestamp: new Date().toLocaleTimeString(),
                          level: 'INFO',
                          message: `SITREP Complete. BLUF: ${data.blufSummary}`
                      }]);
                  }
              } catch (e) {
                  console.error(e);
              }
          }
      }
  };

  const getLogColor = (level: string) => {
      switch(level) {
          case 'INFO': return 'text-emerald-400';
          case 'SIGNAL': return 'text-cyan-400';
          case 'ARMOR_REDACTION': return 'text-amber-400';
          case 'CRITICAL_STALE': return 'text-rose-400';
          default: return 'text-emerald-400';
      }
  };

  const [aiMode, setAiMode] = useState<'local' | 'cloud'>('local');

  useEffect(() => {
      fetch('/api/config')
          .then(res => res.json())
          .then(data => setAiMode(data.mode))
          .catch(e => console.error("Failed to load config", e));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-12 grid-rows-[auto_1fr_1fr] h-screen overflow-hidden">

      {/* Header */}
      <header className="col-span-full flex items-center justify-between glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-serif font-semibold tracking-wide text-emerald-400">ScoutOS <span className="text-muted-foreground text-lg">Director HUD</span></h1>
            {aiMode === 'local' ? (
                <span className="font-mono text-[10px] uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> LOCAL AIR-GAP ACTIVE
                </span>
            ) : (
                <span className="font-mono text-[10px] uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div> CLOUD MODE ACTIVE
                </span>
            )}
        </div>
        <div className="flex gap-4 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> VANGUARD: ACTIVE</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> ARGUS: ACTIVE</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> SENTINEL: ACTIVE</span>
        </div>
      </header>

      {/* Panel A: Vanguard (Genesys/Outlook Signal Stream) */}
      <Card className="col-span-1 lg:col-span-4 glass-panel flex flex-col h-full overflow-hidden">
        <Link to="/vanguard" className="p-3 border-b border-white/10 bg-background/50 backdrop-blur-md hover:bg-white/5 transition-colors group">
          <div className="flex justify-between items-center">
             <h2 className="font-mono text-sm text-emerald-400/80 font-semibold tracking-wider group-hover:text-emerald-300">PANEL A // VANGUARD</h2>
             <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Expand ↗</span>
          </div>
        </Link>
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3 bg-white/5 rounded border border-white/5">
              <span className="text-cyan-400">[SIGNAL]</span> New High-Priority Chat from SOC team. Action required.
            </div>
             <div className="p-3 bg-white/5 rounded border border-white/5">
              <span className="text-emerald-400">[INFO]</span> Daily Executive Briefing generated.
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Panel B: Argus (GRC Intelligence) */}
      <Card className="col-span-1 lg:col-span-4 glass-panel flex flex-col h-full overflow-hidden">
        <Link to="/argus" className="p-3 border-b border-white/10 bg-background/50 backdrop-blur-md hover:bg-white/5 transition-colors group">
          <div className="flex justify-between items-center">
            <h2 className="font-mono text-sm text-rose-400/80 font-semibold tracking-wider group-hover:text-rose-300">PANEL B // ARGUS</h2>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Expand ↗</span>
          </div>
        </Link>
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4 text-sm">
            <h3 className="font-serif text-lg text-rose-300">Extracted Decisions</h3>
             <div className="p-3 bg-white/5 rounded border border-white/5 font-sans">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="font-semibold text-rose-200">Architecture Review - Dec 12</p>
                      <p className="text-muted-foreground text-xs mt-1">Decision: Gate deployment on OPA agent logs.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] uppercase border-white/20 hover:bg-white/10" onClick={() => handleCommitToVault('Decision', 'Architecture Review - Dec 12', 'Gate deployment on OPA agent logs.')}>
                        Commit to Vault
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] uppercase border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleInitiateHLA('Architecture Review - Dec 12', 'Gate deployment on OPA agent logs.')}>
                        Initiate HLA
                    </Button>
                  </div>
              </div>
            </div>
            <h3 className="font-serif text-lg text-rose-300 mt-4">Security Risks</h3>
            {/* Wiz-Style Minimal Toxic Card for Dashboard */}
             <div className="p-3 bg-black/40 rounded border-l-2 border-l-red-600 border border-white/5 font-sans relative">
              <div className="flex justify-between items-start">
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <span className="bg-red-600 text-white font-mono text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">Critical</span>
                          <p className="font-semibold text-rose-100 text-sm">Public Data Exposure Path</p>
                      </div>

                      <div className="flex items-center gap-1 my-2 text-[10px] text-muted-foreground font-mono">
                          <span>Internet</span> <span className="text-rose-500">➔</span> <span>S3</span> <span className="text-red-500 font-bold">➔</span> <span className="text-red-400">PII</span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">SOC2 CC6.1</span>
                          <span className="text-[9px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">NIST AC-3</span>
                      </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] uppercase border-rose-500/30 hover:bg-rose-500/10" onClick={() => handleCommitToVault('Risk', 'Public Data Exposure Path', 'A production S3 bucket containing sensitive customer PII is publicly readable.', ['SOC2 CC6.1', 'NIST 800-53 AC-3'], 'Immediately attach an S3 Block Public Access (BPA) policy at the bucket level.')}>
                      Commit to Vault
                  </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Panel C: Ops/Sentinel (Jira/Calendar) */}
      <Card className="col-span-1 lg:col-span-4 glass-panel flex flex-col h-full overflow-hidden">
        <Link to="/sentinel" className="p-3 border-b border-white/10 bg-background/50 backdrop-blur-md hover:bg-white/5 transition-colors group">
          <div className="flex justify-between items-center">
            <h2 className="font-mono text-sm text-amber-400/80 font-semibold tracking-wider group-hover:text-amber-300">PANEL C // SENTINEL</h2>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Expand ↗</span>
          </div>
        </Link>
        <ScrollArea className="flex-grow p-4">
           <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded border border-rose-500/30">
              <span className="font-mono text-xs text-rose-400">[CRITICAL_STALE]</span>
              <p className="font-sans text-sm mt-1 font-semibold text-foreground">JIRA-8992: Security Audit Findings</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-2 leading-relaxed">
                Stale: &gt;96h.
                <br/>
                <span className="text-amber-400/80">Deep Recall Context:</span> Per our Q3 Architecture Review note in Obsidian, we decided to gate this deployment on the OPA agent logs. What is the current status of that telemetry?
              </p>
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Panel D: Terminal (Nerve Feed) */}
      <Card className="col-span-full glass-panel flex flex-col h-64 mt-4 overflow-hidden relative">
        <Link to="/terminal" className="p-2 border-b border-white/10 bg-black/40 hover:bg-white/5 transition-colors group">
          <div className="flex justify-between items-center">
            <h2 className="font-mono text-xs text-muted-foreground tracking-wider group-hover:text-muted-foreground/80">NERVE FEED // TERMINAL</h2>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Expand ↗</span>
          </div>
        </Link>
        <ScrollArea className="flex-grow p-4 pb-12 bg-black/60 font-mono text-[11px] leading-relaxed">
          <div className="space-y-1">
              {logs.map(log => (
                  <div key={log.id} className={getLogColor(log.level)}>
                      <span className="text-muted-foreground">[{log.timestamp}]</span> [{log.level}] {log.message}
                  </div>
              ))}
          </div>
        </ScrollArea>
        <div className="absolute bottom-0 w-full p-2 bg-black/80 border-t border-white/10 flex items-center">
             <span className="text-emerald-400 font-mono text-xs mr-2">❯</span>
             <input
                 type="text"
                 className="flex-grow bg-transparent border-none outline-none font-mono text-xs text-foreground placeholder:text-muted-foreground"
                 placeholder="Type /sitrep to generate executive summary..."
                 onKeyDown={handleCommand}
             />
        </div>
      </Card>
    </div>
  )
}

export default MissionControl
