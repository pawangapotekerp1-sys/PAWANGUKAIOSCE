import { useState, useRef, useCallback } from "react";
import { getRawAiCredentialKey } from "../lib/api/global-ai-credential-api";

export interface UseGeminiLiveOptions {
  systemInstruction?: string;
  voiceName?: string;
  onTranscript?: (text: string, role: "user" | "model") => void;
  onError?: (error: Error) => void;
}

function int16ToBase64(int16Array: Int16Array) {
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = "";
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary);
}

function base64ToInt16(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const speechRecognitionRef = useRef<any>(null);

  const endCall = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  }, []);

  const playAudioData = useCallback((base64Data: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    
    const int16Array = base64ToInt16(base64Data);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    
    // Gemini output audio is 24kHz
    const buffer = ctx.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    const startTime = Math.max(nextPlayTimeRef.current, ctx.currentTime);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    
    setIsSpeaking(true);
    
    source.onended = () => {
      // Very basic check if we stopped speaking
      if (ctx.currentTime >= nextPlayTimeRef.current - 0.1) {
        setIsSpeaking(false);
      }
    };
  }, []);

  const startCall = useCallback(async () => {
    try {
      setIsConnecting(true);
      const apiKey = await getRawAiCredentialKey();
      if (!apiKey) throw new Error("API Key tidak ditemukan.");

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setIsConnecting(false);
        
        let isSetupComplete = false;
        
        // Define this BEFORE any await so onmessage can catch it if server replies instantly
        (ws as any)._markSetupComplete = () => {
          isSetupComplete = true;
        };

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = 'id-ID';
          recognition.interimResults = false;
          recognition.continuous = true;
          
          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                const text = event.results[i][0].transcript;
                if (text.trim().length > 0) {
                  options.onTranscript?.(text, "user");
                }
              }
            }
          };
          
          recognition.onend = () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              try { recognition.start(); } catch (e) {}
            }
          };
          
          try {
            recognition.start();
            speechRecognitionRef.current = recognition;
          } catch (err) {
            console.error("SpeechRecognition error:", err);
          }
        }

        // 1. Send Setup Message
        const setupMessage = {
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: options.voiceName || "Aoede", // Aoede (Female), Puck (Male), Charon (Male), Kore (Female), Fenrir (Male)
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: options.systemInstruction || "You are a helpful assistant." }]
            }
          }
        };
        ws.send(JSON.stringify(setupMessage));

        try {
          // 2. Setup Audio Capture
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          const ctx = new AudioContext({ sampleRate: 16000 });
          audioContextRef.current = ctx;
          nextPlayTimeRef.current = ctx.currentTime;

          await ctx.audioWorklet.addModule("/worklets/pcm-processor.js");
          
          const source = ctx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(ctx, "pcm-processor");
          workletNodeRef.current = workletNode;

          workletNode.port.onmessage = (event) => {
            if (!isSetupComplete) return; // Wait for setup complete!
            
            const int16Buffer = event.data as Int16Array;
            const base64Data = int16ToBase64(int16Buffer);
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                realtimeInput: {
                  audio: {
                    data: base64Data,
                    mimeType: "audio/pcm;rate=16000"
                  }
                }
              }));
            }
          };

          source.connect(workletNode);
          workletNode.connect(ctx.destination);
        } catch (err) {
          console.error("Audio Setup Error:", err);
          options.onError?.(new Error("Gagal mengakses mikrofon atau memproses audio."));
          endCall();
        }
      };

      ws.onmessage = (event) => {
        try {
          // Could be a blob or string depending on WS config, assume string for JSON
          let rawData = event.data;
          
          // If the server sends Blob (binary JSON framing), we'd need a FileReader.
          // Gemini API typically sends JSON strings over WS for setup/responses.
          if (rawData instanceof Blob) {
             const reader = new FileReader();
             reader.onload = () => {
               handleWsMessage(JSON.parse(reader.result as string), ws);
             };
             reader.readAsText(rawData);
          } else {
             handleWsMessage(JSON.parse(rawData), ws);
          }
        } catch (err) {
          console.error("Failed to parse Gemini WS message", err);
        }
      };

      ws.onerror = (err) => {
        console.error("Gemini Live WebSocket Error:", err);
        options.onError?.(new Error("Koneksi terputus. Silakan coba lagi."));
        endCall();
      };

      ws.onclose = (e) => {
        if (e.code !== 1000 && e.code !== 1005) {
          console.error(`WebSocket Ditutup (Code: ${e.code}, Reason: ${e.reason})`);
          options.onError?.(new Error(`Koneksi ditutup server (Code: ${e.code}). ${e.reason || ''}`));
        }
        endCall();
      };
      
    } catch (err) {
      setIsConnecting(false);
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
      endCall();
    }
  }, [options, endCall]);

  const handleWsMessage = (msg: any, ws: any) => {
    if (msg.setupComplete) {
      if (ws && ws._markSetupComplete) {
        ws._markSetupComplete();
      }
    }
    
    if (msg.serverContent?.modelTurn?.parts) {
      const parts = msg.serverContent.modelTurn.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith("audio/pcm")) {
          playAudioData(part.inlineData.data);
        }
        if (part.text) {
          options.onTranscript?.(part.text, "model");
        }
      }
    }
  };

  return {
    isConnecting,
    isConnected,
    isSpeaking,
    startCall,
    endCall,
  };
}
