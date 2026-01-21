
import React, { useState, useEffect, useRef } from 'react';
import { TranscriptMessage, TARGET_LANGUAGES, TTS_VOICES, TTSVoice } from '../types';
import { translateText } from '../services/translationService';
import { speakText } from '../services/audioService';

interface ReceiverViewProps {
  history: TranscriptMessage[];
  currentPartial: TranscriptMessage | null;
  onBroadcast?: (msg: TranscriptMessage | { type: 'clear' }) => void;
}

const ReceiverView: React.FC<ReceiverViewProps> = ({ history, currentPartial }) => {
  const [targetLang, setTargetLang] = useState<string>('es');
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<TTSVoice>('Zephyr');
  const [translatedHistory, setTranslatedHistory] = useState<{id: string, text: string, sourceLang: string}[]>([]);
  const [activePartialTranslation, setActivePartialTranslation] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTranslatedId = useRef<string>('');
  const audioQueue = useRef<string[]>([]);

  // Translation Engine
  useEffect(() => {
    const processStream = async () => {
      const latest = history[history.length - 1];
      if (latest && latest.id !== lastTranslatedId.current) {
        lastTranslatedId.current = latest.id;
        setActivePartialTranslation('');
        
        const result = await translateText(latest.originalText, targetLang, latest.sourceLang);
        setTranslatedHistory(prev => {
          if (prev.find(item => item.id === latest.id)) return prev;
          return [...prev, { id: latest.id, text: result.text, sourceLang: latest.sourceLang }].slice(-10);
        });

        if (autoSpeak) {
          audioQueue.current.push(result.text);
          if (!isSpeaking) processAudioQueue();
        }
      }
    };
    processStream();
  }, [history, targetLang, autoSpeak]);

  const processAudioQueue = async () => {
    if (audioQueue.current.length === 0) {
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    const nextText = audioQueue.current.shift();
    if (nextText) {
      await speakText(nextText, selectedVoice);
    }
    processAudioQueue();
  };

  // Streaming Partial Translation
  useEffect(() => {
    let active = true;
    const translatePartial = async () => {
      if (currentPartial?.originalText) {
        const result = await translateText(currentPartial.originalText, targetLang, currentPartial.sourceLang);
        if (active) setActivePartialTranslation(result.text);
      } else {
        if (active) setActivePartialTranslation('');
      }
    };
    translatePartial();
    return () => { active = false; };
  }, [currentPartial, targetLang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [translatedHistory, activePartialTranslation]);

  return (
    <div className="relative h-full flex flex-col items-center justify-center">
      {/* Settings Panel */}
      <div className="absolute top-0 right-0 z-50 p-6 md:p-10 animate-in slide-in-from-right-10 duration-1000">
        <div className="bg-black/80 border border-white/10 rounded-3xl p-6 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col gap-5 w-64">
          <div>
            <label className="text-[9px] font-black text-[#ccff00]/60 uppercase tracking-[0.3em] ml-1 mb-2 block">Target Language</label>
            <div className="relative">
              <select 
                value={targetLang} onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-black text-white focus:outline-none focus:border-[#ccff00]/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
              >
                {TARGET_LANGUAGES.map(l => <option key={l.value} value={l.value} className="bg-[#0f0f0f]">{l.label.toUpperCase()}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-[10px]">▼</div>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-[#ccff00]/60 uppercase tracking-[0.3em] ml-1 mb-2 block">Auto-Speech Engine</label>
            <button 
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`w-full py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${autoSpeak ? 'bg-[#ccff00]/10 border-[#ccff00] text-[#ccff00]' : 'bg-white/5 border-white/10 text-white/40'}`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{autoSpeak ? 'Enabled' : 'Disabled'}</span>
              <div className={`w-2 h-2 rounded-full ${autoSpeak ? 'bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]' : 'bg-white/20'}`} />
            </button>
          </div>

          {autoSpeak && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-[9px] font-black text-[#ccff00]/60 uppercase tracking-[0.3em] ml-1 mb-2 block">Voice Signature</label>
              <select 
                value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value as TTSVoice)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white focus:outline-none focus:border-[#ccff00]/50 appearance-none cursor-pointer"
              >
                {TTS_VOICES.map(v => <option key={v.name} value={v.name} className="bg-[#0f0f0f]">{v.label}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-7xl h-full flex flex-col justify-end pb-32 px-10">
        {/* Previous entries - Faded context */}
        <div className="space-y-12 opacity-10 select-none overflow-hidden hover:opacity-20 transition-opacity duration-700">
          {translatedHistory.length > 1 && translatedHistory.slice(0, -1).map((item) => (
            <div key={item.id} className="text-center animate-in fade-in duration-500">
              <p className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight max-w-5xl mx-auto italic">
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Live Stage */}
        <div className="relative mt-20">
          <div className="absolute -inset-64 bg-radial-gradient from-[#ccff0005] to-transparent pointer-events-none opacity-50" />
          
          <div className="relative z-10 flex flex-col items-center justify-center text-center min-h-[300px] space-y-12">
            {!translatedHistory.length && !activePartialTranslation && (
              <div className="py-20 flex flex-col items-center gap-10 animate-in fade-in duration-1000">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-2 border-[#ccff00]/20 rounded-full animate-[ping_3s_infinite]" />
                  <div className="absolute inset-4 border-2 border-[#ccff00]/40 rounded-full animate-[ping_3s_infinite_1s]" />
                  <div className="absolute inset-8 border-2 border-[#ccff00]/60 rounded-full animate-[ping_3s_infinite_2s]" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[1.5em] text-white/10 ml-[1.5em] animate-pulse">Awaiting Signal</p>
              </div>
            )}

            {/* Latest finalized result */}
            {translatedHistory.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <p className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-[0.85] max-w-6xl mx-auto drop-shadow-[0_20px_100px_rgba(204,255,0,0.15)]">
                  {translatedHistory[translatedHistory.length - 1].text}
                </p>
                <div className="mt-12 flex items-center justify-center gap-6">
                  <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#ccff00]/20" />
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#ccff00]/40 flex items-center gap-3">
                    {isSpeaking && <span className="flex gap-1"><span className="w-1 h-2 bg-[#ccff00] animate-bounce" /><span className="w-1 h-2 bg-[#ccff00] animate-bounce delay-75" /></span>}
                    {isSpeaking ? 'Voice Active' : 'Signal Received'}
                  </span>
                  <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#ccff00]/20" />
                </div>
              </div>
            )}

            {/* Streaming partial result */}
            {activePartialTranslation && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-300">
                <p className="text-4xl md:text-6xl font-black text-[#ccff00]/60 italic tracking-tighter leading-tight max-w-5xl mx-auto">
                  {activePartialTranslation}
                </p>
                <div className="mt-8 flex items-center justify-center gap-2">
                  <span className="text-[10px] font-black text-[#ccff00]/20 uppercase tracking-[1em] animate-pulse ml-[1em]">
                    Realtime Syncing
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#ccff0005] rounded-full blur-[180px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#3b82f605] rounded-full blur-[180px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
      </div>
    </div>
  );
};

export default ReceiverView;
