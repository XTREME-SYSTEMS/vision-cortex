import React, { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, PhoneOff, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VoiceChat({ onClose }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [muted, setMuted] = useState(false);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptRef = useRef(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('realtimeVoiceSession', {});
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      const token = data.token;
      if (!token) throw new Error('No session token received');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
              interrupt_response: true,
            },
          },
        }));
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          switch (event.type) {
            case 'conversation.item.created':
              if (event.item?.content?.[0]?.transcript) {
                setTranscript((t) => [...t, {
                  role: event.item.role,
                  text: event.item.content[0].transcript,
                }]);
              }
              break;
            case 'response.audio_transcript.delta':
              // handled via conversation.item.created for complete items
              break;
            case 'input_audio_buffer.speech_started':
              setUserSpeaking(true);
              setAiSpeaking(false);
              break;
            case 'input_audio_buffer.speech_stopped':
              setUserSpeaking(false);
              break;
            case 'response.audio.delta':
              setAiSpeaking(true);
              break;
            case 'response.done':
              setAiSpeaking(false);
              break;
            case 'error':
              setError(event.error?.message || 'Realtime error');
              break;
          }
        } catch {}
      };

      pc.ontrack = (e) => {
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
          audioRef.current.play().catch(() => {});
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      pc.addTrack(stream.getTracks()[0]);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        const errText = await sdpResponse.text();
        throw new Error(`Connection failed: ${errText}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setConnected(true);
      setConnecting(false);
    } catch (e) {
      setError(e.message || 'Failed to connect');
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    dcRef.current = null;
    setConnected(false);
    setAiSpeaking(false);
    setUserSpeaking(false);
  }, []);

  const toggleMute = () => {
    if (streamRef.current) {
      const track = streamRef.current.getTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setMuted(!track.enabled);
      }
    }
  };

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-emerald-500 animate-pulse' : connecting ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground'
          )} />
          <span className="text-sm font-medium">
            {connected ? 'Voice Chat Live' : connecting ? 'Connecting…' : 'Voice Chat'}
          </span>
        </div>
        <button onClick={() => { disconnect(); onClose(); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Animated orb */}
        <div className="relative mb-8">
          <div className={cn(
            'w-32 h-32 rounded-full transition-all duration-300',
            aiSpeaking ? 'bg-blue-500/20 scale-110' : userSpeaking ? 'bg-emerald-500/20 scale-105' : 'bg-muted',
            connected && 'animate-pulse'
          )} />
          <div className={cn(
            'absolute inset-0 rounded-full border-2 transition-all',
            aiSpeaking ? 'border-blue-500/40 animate-ping' : userSpeaking ? 'border-emerald-500/40' : 'border-border/40'
          )} />
          <div className="absolute inset-0 grid place-items-center">
            {connecting ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : aiSpeaking ? (
              <Volume2 className="w-8 h-8 text-blue-500" />
            ) : userSpeaking ? (
              <Mic className="w-8 h-8 text-emerald-500" />
            ) : (
              <Phone className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Status text */}
        <p className="text-sm text-muted-foreground mb-2">
          {error ? error :
           connecting ? 'Establishing real-time connection…' :
           aiSpeaking ? 'Prime is speaking… (tap mic to interrupt)' :
           userSpeaking ? 'Listening…' :
           connected ? 'Connected — just start speaking' :
           'Tap connect to start a voice conversation'}
        </p>
        <p className="text-[10px] text-muted-foreground/60 max-w-xs text-center">
          Powered by OpenAI Realtime API with barge-in — speak naturally, interrupt anytime
        </p>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div ref={transcriptRef} className="absolute bottom-4 left-4 right-4 max-h-32 overflow-y-auto space-y-1.5 no-scrollbar">
            {transcript.slice(-8).map((t, i) => (
              <div key={i} className={cn(
                'text-xs rounded-lg px-2.5 py-1.5 max-w-[85%]',
                t.role === 'user' ? 'bg-foreground text-background ml-auto' : 'bg-muted text-foreground'
              )}>
                {t.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-4 border-t border-border/60">
        {error && !connected && (
          <p className="text-xs text-red-500 text-center mb-3">{error}</p>
        )}
        <div className="flex items-center justify-center gap-4">
          {connected && (
            <button
              onClick={toggleMute}
              className={cn(
                'w-12 h-12 rounded-full grid place-items-center transition-colors',
                muted ? 'bg-red-500/20 text-red-500' : 'bg-muted text-foreground hover:bg-muted/70'
              )}
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {!connected ? (
            <button
              onClick={connect}
              disabled={connecting}
              className="w-16 h-16 rounded-full bg-emerald-500 text-white grid place-items-center disabled:opacity-40 hover:bg-emerald-600 transition-colors"
            >
              {connecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Phone className="w-6 h-6" />}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="w-16 h-16 rounded-full bg-red-500 text-white grid place-items-center hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}