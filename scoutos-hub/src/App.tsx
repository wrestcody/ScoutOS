import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

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

  const getLogColor = (level: string) => {
      switch(level) {
          case 'INFO': return 'text-emerald-400';
          case 'SIGNAL': return 'text-cyan-400';
          case 'ARMOR_REDACTION': return 'text-amber-400';
          case 'CRITICAL_STALE': return 'text-rose-400';
          default: return 'text-emerald-400';
      }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-12 grid-rows-[auto_1fr_1fr] h-screen overflow-hidden">

      {/* Header */}
      <header className="col-span-full flex items-center justify-between glass-panel p-4 rounded-xl">
        <h1 className="text-2xl font-serif font-semibold tracking-wide text-emerald-400">ScoutOS <span className="text-muted-foreground text-lg">Director HUD</span></h1>
        <div className="flex gap-4 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> VANGUARD: ACTIVE</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> ARGUS: ACTIVE</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> SENTINEL: ACTIVE</span>
        </div>
      </header>

      {/* Panel A: Vanguard (Genesys/Outlook Signal Stream) */}
      <Card className="col-span-1 lg:col-span-4 glass-panel flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b border-white/10 bg-background/50 backdrop-blur-md">
          <h2 className="font-mono text-sm text-emerald-400/80 font-semibold tracking-wider">PANEL A // VANGUARD</h2>
        </div>
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
        <div className="p-3 border-b border-white/10 bg-background/50 backdrop-blur-md">
          <h2 className="font-mono text-sm text-rose-400/80 font-semibold tracking-wider">PANEL B // ARGUS</h2>
        </div>
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4 text-sm">
            <h3 className="font-serif text-lg text-rose-300">Extracted Decisions</h3>
             <div className="p-3 bg-white/5 rounded border border-white/5 font-sans">
              <p className="font-semibold text-rose-200">Architecture Review - Dec 12</p>
              <p className="text-muted-foreground text-xs mt-1">Decision: Gate deployment on OPA agent logs.</p>
            </div>
            <h3 className="font-serif text-lg text-rose-300 mt-4">Security Risks</h3>
             <div className="p-3 bg-white/5 rounded border border-rose-500/20 font-sans">
              <p className="font-semibold text-rose-400">SOC2 Control Gap</p>
              <p className="text-muted-foreground text-xs mt-1">Missing access reviews for new S3 buckets. Auto-mapping to CC6.1.</p>
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Panel C: Ops/Sentinel (Jira/Calendar) */}
      <Card className="col-span-1 lg:col-span-4 glass-panel flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b border-white/10 bg-background/50 backdrop-blur-md">
          <h2 className="font-mono text-sm text-amber-400/80 font-semibold tracking-wider">PANEL C // SENTINEL</h2>
        </div>
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
      <Card className="col-span-full glass-panel flex flex-col h-64 mt-4 overflow-hidden">
        <div className="p-2 border-b border-white/10 bg-black/40 flex justify-between items-center">
          <h2 className="font-mono text-xs text-muted-foreground tracking-wider">NERVE FEED // TERMINAL</h2>
        </div>
        <ScrollArea className="flex-grow p-4 bg-black/60 font-mono text-[11px] leading-relaxed">
          <div className="space-y-1">
              {logs.map(log => (
                  <div key={log.id} className={getLogColor(log.level)}>
                      <span className="text-muted-foreground">[{log.timestamp}]</span> [{log.level}] {log.message}
                  </div>
              ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}

export default MissionControl
