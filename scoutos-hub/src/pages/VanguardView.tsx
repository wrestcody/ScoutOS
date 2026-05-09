import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

function VanguardView() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between glass-panel p-4 rounded-xl">
        <h1 className="text-2xl font-serif font-semibold tracking-wide text-emerald-400">VANGUARD <span className="text-muted-foreground text-lg">// Detailed Analysis</span></h1>
        <div className="flex gap-4">
           <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 uppercase text-xs">Clear All Signals</Button>
           <Link to="/">
             <Button variant="outline" size="sm" className="border-white/20 hover:bg-white/10 uppercase text-xs">Back to HUD</Button>
           </Link>
        </div>
      </header>

      <Card className="flex-grow glass-panel flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-background/50 backdrop-blur-md flex justify-between items-center">
            <h2 className="font-mono text-sm text-emerald-400/80 font-semibold tracking-wider">LIVE STREAM</h2>
            <span className="font-mono text-xs text-muted-foreground animate-pulse">Polling active...</span>
        </div>
        <ScrollArea className="flex-grow p-6">
          <div className="space-y-4 font-mono text-sm">
             <div className="p-4 bg-white/5 rounded border border-white/5">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Source: Genesys Cloud</span>
                    <span>10:04 AM</span>
                </div>
                <span className="text-cyan-400">[SIGNAL]</span> New High-Priority Chat from SOC team. Action required.
             </div>
             <div className="p-4 bg-white/5 rounded border border-white/5">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Source: Microsoft Graph</span>
                    <span>09:41 AM</span>
                </div>
                <span className="text-emerald-400">[INFO]</span> Daily Executive Briefing generated.
             </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

export default VanguardView;
