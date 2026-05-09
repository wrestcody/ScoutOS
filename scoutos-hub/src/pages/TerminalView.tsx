import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

type LogEntry = {
    id: string;
    timestamp: string;
    level: 'INFO' | 'SIGNAL' | 'ARMOR_REDACTION' | 'CRITICAL_STALE';
    message: string;
}

function TerminalView() {
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: '1', timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'System initialized. Armor Layer active. Detailed terminal view loaded.' }
    ]);

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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between glass-panel p-4 rounded-xl">
        <h1 className="text-2xl font-serif font-semibold tracking-wide text-muted-foreground">TERMINAL <span className="text-muted-foreground/50 text-lg">// Nerve Feed</span></h1>
        <div className="flex gap-4">
           <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 uppercase text-xs" onClick={() => setLogs([])}>Clear Logs</Button>
           <Link to="/">
             <Button variant="outline" size="sm" className="border-white/20 hover:bg-white/10 uppercase text-xs">Back to HUD</Button>
           </Link>
        </div>
      </header>

      <Card className="flex-grow glass-panel flex flex-col overflow-hidden relative">
        <ScrollArea className="flex-grow p-6 pb-20 bg-black/80 font-mono text-sm leading-loose">
          <div className="space-y-2">
              {logs.map(log => (
                  <div key={log.id} className={getLogColor(log.level)}>
                      <span className="text-muted-foreground mr-3">[{log.timestamp}]</span>
                      <span className="font-bold mr-2">[{log.level}]</span>
                      {log.message}
                  </div>
              ))}
          </div>
        </ScrollArea>
        <div className="absolute bottom-0 w-full p-4 bg-black border-t border-white/10 flex items-center">
             <span className="text-emerald-400 font-mono text-lg mr-4">❯</span>
             <input
                 type="text"
                 className="flex-grow bg-transparent border-none outline-none font-mono text-base text-foreground placeholder:text-muted-foreground"
                 placeholder="Type a command (e.g., /sitrep, /clear)..."
                 onKeyDown={handleCommand}
                 autoFocus
             />
        </div>
      </Card>
    </div>
  );
}

export default TerminalView;
