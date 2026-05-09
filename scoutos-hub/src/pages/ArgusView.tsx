import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

function ArgusView() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between glass-panel p-4 rounded-xl">
        <h1 className="text-2xl font-serif font-semibold tracking-wide text-rose-400">ARGUS <span className="text-muted-foreground text-lg">// Intelligence Extraction</span></h1>
        <div className="flex gap-4">
           <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 uppercase text-xs">Run Bulk Extraction</Button>
           <Link to="/">
             <Button variant="outline" size="sm" className="border-white/20 hover:bg-white/10 uppercase text-xs">Back to HUD</Button>
           </Link>
        </div>
      </header>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-panel flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-background/50 backdrop-blur-md">
                <h2 className="font-mono text-sm text-rose-400/80 font-semibold tracking-wider">TECHNICAL DECISIONS</h2>
            </div>
            <ScrollArea className="flex-grow p-6">
                <div className="p-4 bg-white/5 rounded border border-white/5 font-sans mb-4">
                    <p className="font-semibold text-rose-200 text-lg">Architecture Review - Dec 12</p>
                    <p className="text-muted-foreground text-sm mt-2">Decision: Gate deployment on OPA agent logs.</p>
                    <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs uppercase border-white/20 hover:bg-white/10">Commit to Vault</Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs uppercase border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">Initiate HLA</Button>
                    </div>
                </div>
            </ScrollArea>
          </Card>

          <Card className="glass-panel flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-background/50 backdrop-blur-md">
                <h2 className="font-mono text-sm text-rose-400/80 font-semibold tracking-wider">SECURITY RISKS</h2>
            </div>
            <ScrollArea className="flex-grow p-6">
                <div className="p-4 bg-white/5 rounded border border-rose-500/20 font-sans mb-4">
                    <p className="font-semibold text-rose-400 text-lg">SOC2 Control Gap</p>
                    <p className="text-muted-foreground text-sm mt-2">Missing access reviews for new S3 buckets. Auto-mapping to CC6.1.</p>
                    <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs uppercase border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Commit to Vault</Button>
                    </div>
                </div>
            </ScrollArea>
          </Card>
      </div>
    </div>
  );
}

export default ArgusView;
