
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptMessage, LANGUAGES, SpeakerGender } from '../types';

interface TranscriberViewProps {
  onBroadcast: (msg: TranscriptMessage | { type: 'clear' }) => void;
  history: TranscriptMessage[];
  currentPartial: TranscriptMessage | null;
}

const TranscriberView: React.FC<TranscriberViewProps> = ({ onBroadcast, history, currentPartial }) => {
  const [isListening, setIsListening] = useState(false);
  const [sourceLang, setSourceLang] = useState('en-US');
  const [gender, setGender] = useState<SpeakerGender>('neutral');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for(let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(204, 255, 0, ${barHeight / canvas.height + 0.1})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }, []);

  const stopAudioCapture = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      drawVisualizer();
    } catch (e) {
      console.error("Audio capture failed", e);
    }
  };

  const stopRecognition = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    stopAudioCapture();
    
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setStatusMessage('Standby');
  }, [drawVisualizer]);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage('API not supported');
      return;
    }

    if (recognitionRef.current) stopRecognition();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = sourceLang;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setStatusMessage('Broadcasting Live');
      startAudioCapture();
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        restartTimerRef.current = window.setTimeout(() => {
          if (isListeningRef.current) {
            try { recognition.start(); } catch (e) {}
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      setStatusMessage(`Error: ${event.error}`);
      if (['not-allowed', 'service-not-allowed'].includes(event.error)) stopRecognition();
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }

      const timestamp = Date.now();
      if (interimTranscript) {
        onBroadcast({
          type: 'partial', id: `p-${timestamp}`, timestamp,
          sourceLang, originalText: interimTranscript, gender, isOffline: !navigator.onLine
        });
      }
      if (finalTranscript) {
        onBroadcast({
          type: 'final', id: `f-${timestamp}-${Math.random().toString(36).substr(2, 4)}`, timestamp,
          sourceLang, originalText: finalTranscript, gender, isOffline: !navigator.onLine
        });
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setStatusMessage('Init Error'); }
  }, [sourceLang, gender, onBroadcast, stopRecognition]);

  const toggleListening = () => isListening ? stopRecognition() : startRecognition();

  useEffect(() => {
    if (isListeningRef.current) startRecognition();
  }, [sourceLang, startRecognition]);

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <section className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
            {isListening && <div className="h-full bg-[#ccff00] animate-[shimmer_2s_infinite]" style={{ width: '40%', boxShadow: '0 0 10px #ccff00' }} />}
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ccff00] flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]' : 'bg-white/10'}`} />
              Studio Feed
            </h2>
            <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${isOnline ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
              {isOnline ? 'Network Stable' : 'Offline Mode'}
            </div>
          </div>

          <div className="mb-8 h-16 bg-black/40 rounded-xl overflow-hidden border border-white/5">
            <canvas ref={canvasRef} width={400} height={64} className="w-full h-full opacity-60" />
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-3 ml-1">Input Language</label>
              <select 
                value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-[#ccff00]/50 transition-all appearance-none cursor-pointer hover:bg-white/[0.08]"
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value} className="bg-[#0a0a0a]">{l.label}</option>)}
              </select>
            </div>

            <div className="pt-2">
              <button 
                onClick={toggleListening} 
                className={`w-full py-5 rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all flex flex-col items-center justify-center gap-2 ${isListening ? 'bg-red-500/10 border border-red-500/50 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.1)]' : 'bg-[#ccff00] text-black shadow-[0_0_40px_rgba(204,255,0,0.2)] hover:scale-[1.02]'}`}
              >
                <span>{isListening ? 'End Broadcast' : 'Start Broadcast'}</span>
                <span className="text-[8px] opacity-60 font-black tracking-[0.1em]">{statusMessage}</span>
              </button>
            </div>
          </div>
        </section>

        <button
          onClick={() => onBroadcast({ type: 'clear' })}
          className="w-full py-4 rounded-2xl border border-white/5 text-white/20 text-[9px] font-black uppercase tracking-[0.3em] hover:text-[#ccff00]/60 hover:border-[#ccff00]/20 transition-all group"
        >
          Reset Session
        </button>
      </div>

      <div className="lg:col-span-8">
        <div className="h-[70vh] lg:h-full bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-md flex flex-col overflow-hidden relative group/feed">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Signal Monitor</h2>
            <div className="flex items-center gap-4">
              {isListening && (
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-1 h-3 bg-[#ccff00] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
              <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">Live Telemetry</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-4 space-y-10 scroll-smooth custom-scrollbar">
            {currentPartial && (
              <div className="border-l-[3px] border-[#ccff00]/60 pl-8 py-2 animate-in fade-in slide-in-from-left-4 duration-300">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#ccff00] mb-3 block">Incoming...</span>
                <p className="text-white text-3xl font-black leading-tight italic opacity-80 tracking-tight">
                  {currentPartial.originalText}
                </p>
              </div>
            )}

            {history.length === 0 && !isListening && !currentPartial && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-10 select-none grayscale">
                <div className="w-24 h-24 mb-6 border-2 border-dashed border-white rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                   <span className="text-2xl font-black">O</span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-[0.5em]">Orbit Inactive</h3>
                <p className="text-[9px] font-bold mt-4 tracking-widest uppercase">Awaiting Signal Ignition</p>
              </div>
            )}
            
            {history.slice().reverse().map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 border-l border-white/10 pl-8 hover:border-[#ccff00]/40 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className="px-2 py-0.5 bg-white/5 text-[8px] text-white/30 rounded-full font-black uppercase">Buffered</span>
                </div>
                <p className="text-white/60 text-2xl font-bold leading-snug italic tracking-tight">
                  {msg.originalText}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriberView;
