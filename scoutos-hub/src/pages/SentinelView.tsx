import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

function SentinelView() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between glass-panel p-4 rounded-xl">
        <h1 className="text-2xl font-serif font-semibold tracking-wide text-amber-400">SENTINEL <span className="text-muted-foreground text-lg">// Operations Oversight</span></h1>
        <div className="flex gap-4">
           <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 uppercase text-xs">Force Refresh Index</Button>
           <Link to="/">
             <Button variant="outline" size="sm" className="border-white/20 hover:bg-white/10 uppercase text-xs">Back to HUD</Button>
           </Link>
        </div>
      </header>

      <Card className="flex-grow glass-panel flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-background/50 backdrop-blur-md">
            <h2 className="font-mono text-sm text-amber-400/80 font-semibold tracking-wider">STALE OPERATIONS & DEEP RECALL</h2>
        </div>
        <ScrollArea className="flex-grow p-6">
           <div className="space-y-6">
            <div className="p-5 bg-white/5 rounded border border-rose-500/30">
              <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-sm text-rose-400">[CRITICAL_STALE]</span>
                  <span className="text-xs text-muted-foreground bg-black/40 px-2 py-1 rounded">Stale: &gt;96h</span>
              </div>
              <p className="font-sans text-lg font-semibold text-foreground">JIRA-8992: Security Audit Findings</p>

              <div className="mt-4 p-4 bg-black/40 rounded border border-white/5">
                <p className="font-mono text-xs text-amber-400/80 mb-2">DEEP RECALL CONTEXT:</p>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                    Per our Q3 Architecture Review note in Obsidian, we decided to gate this deployment on the OPA agent logs. What is the current status of that telemetry?
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs uppercase border-white/20 hover:bg-white/10">Dispatch Nudge</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs uppercase border-white/20 hover:bg-white/10">View in Jira</Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

export default SentinelView;
