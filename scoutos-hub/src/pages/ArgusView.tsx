import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

function ArgusView() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          // Send to the backend endpoint we will create
          const response = await fetch('/api/skills/argus/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            console.error("Transcription failed", await response.text());
          } else {
            const data = await response.json();
            console.log("Transcription result:", data);
            // Here we would ideally add the transcription to the UI,
            // but for now logging is sufficient to show integration.
          }
        } catch (e) {
          console.error("Failed to send audio", e);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks to release the microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-serif font-semibold tracking-wide text-rose-400">ARGUS <span className="text-muted-foreground text-lg">// Intelligence Extraction</span></h1>

          <div className="h-6 w-px bg-white/20 mx-2"></div>

          {!isRecording ? (
             <Button
                variant="outline"
                size="sm"
                onClick={handleStartRecording}
                disabled={isProcessing}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 uppercase text-xs flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
                {isProcessing ? "Processing..." : "Record Intake"}
             </Button>
          ) : (
             <Button
                variant="outline"
                size="sm"
                onClick={handleStopRecording}
                className="border-red-500 text-red-400 bg-red-500/20 hover:bg-red-500/30 uppercase text-xs flex items-center gap-2 animate-pulse"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop Recording
             </Button>
          )}
        </div>

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
                {/* Wiz-Style Toxic Combination Card */}
                <div className="p-5 bg-black/40 rounded border-l-4 border-l-red-600 border border-white/5 font-sans mb-4 relative shadow-lg shadow-red-900/10">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <span className="bg-red-600 text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Critical</span>
                            <p className="font-semibold text-rose-100 text-lg">Public Data Exposure Path</p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">Asset: s3-prod-customer-data</span>
                    </div>

                    {/* Attack Path Visualization */}
                    <div className="my-4 p-3 bg-white/5 rounded flex items-center gap-2 overflow-x-auto">
                         <div className="flex flex-col items-center flex-shrink-0">
                             <div className="w-8 h-8 rounded bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400">🌐</div>
                             <span className="text-[9px] font-mono mt-1 text-muted-foreground">Internet</span>
                         </div>
                         <div className="text-muted-foreground">➔</div>
                         <div className="flex flex-col items-center flex-shrink-0">
                             <div className="w-8 h-8 rounded bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">🔓</div>
                             <span className="text-[9px] font-mono mt-1 text-muted-foreground">Public S3 Bucket</span>
                         </div>
                         <div className="text-red-500 font-bold">➔</div>
                         <div className="flex flex-col items-center flex-shrink-0">
                             <div className="w-8 h-8 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">⚠️</div>
                             <span className="text-[9px] font-mono mt-1 text-red-400 font-bold">Sensitive PII</span>
                         </div>
                    </div>

                    <div className="mb-4">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            <strong className="text-rose-200 font-medium">Impact:</strong> A production S3 bucket containing sensitive customer PII is publicly readable due to a misconfigured bucket policy, enabling unauthenticated external access.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded">SOC2 CC6.1</span>
                        <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-1 rounded">NIST 800-53 AC-3</span>
                        <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded">HIPAA 164.312(a)(1)</span>
                    </div>

                    <div className="mt-4 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-md">
                        <p className="font-mono text-[10px] text-emerald-400 mb-1">REMEDIATION GUIDANCE (AWS)</p>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Immediately attach an S3 Block Public Access (BPA) policy at the bucket level. Ensure the `s3:GetObject` permission is restricted to specific VPC Endpoints or IAM roles.
                        </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs uppercase border-rose-500/30 text-rose-400 hover:bg-rose-500/10" onClick={() => {
                            console.log("Committing Risk with Crosswalk data to Vault...");
                        }}>Commit to Vault</Button>
                         <Button variant="outline" size="sm" className="h-8 text-xs uppercase border-white/10 text-muted-foreground hover:bg-white/5">
                            Suppress
                        </Button>
                    </div>
                </div>
            </ScrollArea>
          </Card>
      </div>
    </div>
  );
}

export default ArgusView;
