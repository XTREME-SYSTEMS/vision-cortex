import React, { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, PhoneOff, Loader2, Mic, MicOff, Volume2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  float32ToPCM16,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  pcm16ToFloat32,
  downsampleBuffer,
} from '@/lib/realtimeAudio';

const SAMPLE_RATE = 24000;

export default function VoiceChat({ onClose }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [muted, setMuted] = useState(false);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const transcriptRef = useRef(null);
  const aiTranscriptRef = useRef('');
  const mutedRef = useRef(false);

  const playAudioChunk = useCallback((base64Audio) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    const int16 = new Int16Array(arrayBuffer);
    const float32 = pcm16ToFloat32(int16);

    const audioBuffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextPlayTimeRef.current < now) {
      nextPlayTimeRef.current = now;
    }
    src.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += float32.length / SAMPLE_RATE;
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      // Get token from our backend function (which calls Vercel AI Gateway)
      const res = await base44.functions.invoke('realtimeVoiceSession', {});
      const data = res.data || res;
      if (data.error) throw new Error(data.error);

      const { token, url, voice, instructions, protocols } = data;
      if (!token || !url) throw new Error('No session token or URL received');

      // Create AudioContext for playback at 24kHz
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioContext;

      // Connect via WebSocket with Vercel AI Gateway subprotocols
      const ws = new WebSocket(url, protocols);
      wsRef.current = ws;

      ws.onopen = async () => {
        // Configure the session with voice, instructions, and server VAD
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            voice: voice || 'alloy',
            instructions: instructions || 'You are a helpful assistant.',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
              interrupt_response: true,
            },
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            modalities: ['text', 'audio'],
            input_audio_transcription: { model: 'whisper-1' },
          },
        }));

        // Start capturing microphone audio
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          streamRef.current = stream;

          // Use a separate AudioContext for capture at native rate, then downsample
          const captureCtx = new AudioContext();
          const source = captureCtx.createMediaStreamSource(stream);
          const processor = captureCtx.createScriptProcessor(4096, 1, 1);
          sourceRef.current = source;
          processorRef.current = processor;
          const captureRate = captureCtx.sampleRate;

          processor.onaudioprocess = (e) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            if (mutedRef.current) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const downsampled = downsampleBuffer(inputData, captureRate, SAMPLE_RATE);
            const pcm16 = float32ToPCM16(downsampled);
            const base64 = arrayBufferToBase64(pcm16.buffer);

            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64,
            }));
          };

          source.connect(processor);
          processor.connect(captureCtx.destination);

          setConnected(true);
          setConnecting(false);
        } catch (micErr) {
          throw new Error(`Microphone access failed: ${micErr.message}`);
        }
      };

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          switch (event.type) {
            case 'session.created':
            case 'session.updated':
              break;

            case 'input_audio_buffer.speech_started':
              setUserSpeaking(true);
              setAiSpeaking(false);
              nextPlayTimeRef.current = 0; // Reset playback for barge-in
              break;

            case 'input_audio_buffer.speech_stopped':
              setUserSpeaking(false);
              break;

            case 'response.audio.delta':
              if (event.delta) {
                setAiSpeaking(true);
                playAudioChunk(event.delta);
              }
              break;

            case 'response.audio_transcript.delta':
              if (event.delta) {
                aiTranscriptRef.current += event.delta;
              }
              break;

            case 'response.audio_transcript.done':
              if (aiTranscriptRef.current) {
                setTranscript((t) => [...t, {
                  role: 'assistant',
                  text: aiTranscriptRef.current,
                }]);
                aiTranscriptRef.current = '';
              }
              break;

            case 'conversation.item.input_audio_transcription.completed':
              if (event.transcript) {
                setTranscript((t) => [...t, {
                  role: 'user',
                  text: event.transcript,
                }]);
              }
              break;

            case 'response.done':
              setAiSpeaking(false);
              if (aiTranscriptRef.current) {
                setTranscript((t) => [...t, {
                  role: 'assistant',
                  text: aiTranscriptRef.current,
                }]);
                aiTranscriptRef.current = '';
              }
              break;

            case 'error':
              setError(event.error?.message || 'Realtime error');
              break;
          }
        } catch {}
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        setConnecting(false);
      };

      ws.onclose = () => {
        setConnected(false);
        setAiSpeaking(false);
        setUserSpeaking(false);
      };
    } catch (e) {
      setError(e.message || 'Failed to connect');
      setConnecting(false);
    }
  }, [playAudioChunk]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setConnected(false);
    setAiSpeaking(false);
    setUserSpeaking(false);
    nextPlayTimeRef.current = 0;
  }, []);

  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  };

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
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
           connecting ? 'Establishing Vercel AI Gateway connection…' :
           aiSpeaking ? 'Prime is speaking… (just start talking to interrupt)' :
           userSpeaking ? 'Listening…' :
           connected ? 'Connected — just start speaking' :
           'Tap connect to start a voice conversation'}
        </p>
        <p className="text-[10px] text-muted-foreground/60 max-w-xs text-center flex items-center justify-center gap-1">
          <Zap className="w-3 h-3" />
          Powered by Vercel AI Gateway · gpt-realtime-2.1 · server-side VAD with barge-in
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