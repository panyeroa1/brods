
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppView, TranscriptMessage } from './types';
import TranscriberView from './components/TranscriberView';
import ReceiverView from './components/ReceiverView';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.TRANSCRIPTION);
  const [history, setHistory] = useState<TranscriptMessage[]>([]);
  const [currentPartial, setCurrentPartial] = useState<TranscriptMessage | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for cross-tab and cross-component communication
  useEffect(() => {
    const channel = new BroadcastChannel('orbit_autotranslate');
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const msg = event.data as TranscriptMessage | { type: 'clear' };
      if (msg.type === 'clear') {
        setHistory([]);
        setCurrentPartial(null);
      } else if (msg.type === 'partial') {
        setCurrentPartial(msg);
      } else if (msg.type === 'final') {
        setHistory(prev => [...prev, msg].slice(-100)); // Keep last 100 messages
        setCurrentPartial(null);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const handleBroadcast = useCallback((msg: TranscriptMessage | { type: 'clear' }) => {
    if (channelRef.current) {
      channelRef.current.postMessage(msg);
    }
    // Update local state too
    if (msg.type === 'clear') {
      setHistory([]);
      setCurrentPartial(null);
    } else if (msg.type === 'partial') {
      setCurrentPartial(msg);
    } else if (msg.type === 'final') {
      setHistory(prev => [...prev, msg].slice(-100));
      setCurrentPartial(null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e7eb] flex flex-col relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#ccff0010] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3b82f610] rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a95] backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ccff00] to-[#39ff14] shadow-[0_0_20px_rgba(204,255,0,0.3)] flex items-center justify-center">
            <span className="text-[#000] font-black text-xs">O</span>
          </div>
          <h1 className="font-black tracking-[0.2em] text-xs uppercase text-white/90">Orbit Autotranslate</h1>
        </div>

        <nav className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setView(AppView.TRANSCRIPTION)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${view === AppView.TRANSCRIPTION ? 'bg-white/10 text-[#ccff00] shadow-sm' : 'text-white/40 hover:text-white/60'}`}
          >
            Transcribe
          </button>
          <button
            onClick={() => setView(AppView.TRANSLATION)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${view === AppView.TRANSLATION ? 'bg-white/10 text-[#ccff00] shadow-sm' : 'text-white/40 hover:text-white/60'}`}
          >
            Translate
          </button>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.5)]" />
          <span className="text-[10px] font-bold tracking-tighter text-white/40 uppercase">System Ready</span>
        </div>
      </header>

      {/* Main Content - Both views are kept mounted to allow background processing */}
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col">
        <div className={`flex-1 ${view !== AppView.TRANSCRIPTION ? 'hidden' : 'block'}`}>
          <TranscriberView onBroadcast={handleBroadcast} history={history} currentPartial={currentPartial} />
        </div>
        <div className={`flex-1 ${view !== AppView.TRANSLATION ? 'hidden' : 'block'}`}>
          <ReceiverView history={history} currentPartial={currentPartial} onBroadcast={handleBroadcast} />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-sm text-center">
        <p className="text-[10px] font-medium text-white/20 tracking-widest uppercase">
          Powered by Gemini 3 Flash & Web Speech API
        </p>
      </footer>
    </div>
  );
};

export default App;
